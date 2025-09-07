import os
import shutil
import subprocess
import uuid
import random
from pathlib import Path
from typing import Optional
import logging

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# -- Model imports --
import torch
from diffusers import StableDiffusionPipeline

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- Config ----------
BASE_DIR = Path(__file__).resolve().parent
OUT_DIR = BASE_DIR / "outputs"
STATIC_DIR = BASE_DIR / "static"
OUT_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)

MODEL_ID = os.environ.get("SD_MODEL", "runwayml/stable-diffusion-v1-5")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
BATCH_SIZE = 4  # Process frames in batches for memory efficiency

app = FastAPI(title="Text→Minecraft Video (FastAPI)", version="1.0.0")

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (frontend build)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Basic check: ffmpeg available?
def ensure_ffmpeg():
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not found. Install ffmpeg and make sure it's in PATH.")

# Load model once (may take time)
logger.info(f"Loading model {MODEL_ID} to {DEVICE} — this may take a minute...")
try:
    torch_kwargs = {"torch_dtype": torch.float16} if DEVICE == "cuda" else {}
    pipe = StableDiffusionPipeline.from_pretrained(MODEL_ID, **torch_kwargs)
    pipe = pipe.to(DEVICE)
    
    # Optionally disable safety checker for speed/compat
    try:
        pipe.safety_checker = None
    except Exception:
        pass
    
    logger.info("Model loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    pipe = None

# ---------- Request model ----------
class GenRequest(BaseModel):
    prompt: str
    length_seconds: int = 20  # Default to 20 seconds
    fps: int = 8              # Optimized for 20-second videos
    width: int = 512
    height: int = 512
    seed: Optional[int] = None
    num_inference_steps: int = 20  # Balance between quality and speed

# ---------- Endpoints ----------
@app.get("/", response_class=HTMLResponse)
def index():
    return HTMLResponse("""
    <html>
        <head><title>Text → Minecraft Video API</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Text → Minecraft Video API</h1>
            <p>FastAPI backend is running successfully!</p>
            <p>Frontend should be served from Next.js on port 3000</p>
            <ul>
                <li>POST /generate - Generate video</li>
                <li>GET /status/{job_id} - Check status</li>
                <li>GET /download/{job_id} - Download video</li>
            </ul>
        </body>
    </html>
    """)

@app.post("/generate")
async def generate(req: GenRequest, background_tasks: BackgroundTasks):
    if pipe is None:
        raise HTTPException(status_code=503, detail="Model not loaded on server.")
    
    # Basic validation
    if req.length_seconds <= 0 or req.fps <= 0:
        raise HTTPException(status_code=400, detail="length_seconds and fps must be > 0")
    if req.width % 8 != 0 or req.height % 8 != 0:
        raise HTTPException(status_code=400, detail="width/height should be multiples of 8")

    job_id = str(uuid.uuid4())[:10]
    job_dir = OUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    
    # Save metadata
    meta_content = f"""prompt: {req.prompt}
length_seconds: {req.length_seconds}
fps: {req.fps}
width: {req.width}
height: {req.height}
seed: {req.seed}
total_frames: {req.length_seconds * req.fps}
"""
    (job_dir / "meta.txt").write_text(meta_content)
    
    # Create status file
    (job_dir / "status.txt").write_text("starting")
    
    # Launch background task
    background_tasks.add_task(run_generation, req.dict(), str(job_dir))
    
    return {
        "job_id": job_id,
        "status_url": f"/status/{job_id}",
        "download_url": f"/download/{job_id}",
        "estimated_time_minutes": req.length_seconds * req.fps // 10  # Rough estimate
    }

@app.get("/status/{job_id}")
def status(job_id: str):
    job_dir = OUT_DIR / job_id
    if not job_dir.exists():
        return {"job_id": job_id, "exists": False}
    
    # Read status
    status_file = job_dir / "status.txt"
    current_status = "unknown"
    if status_file.exists():
        current_status = status_file.read_text().strip()
    
    # Check if ready
    ready = (job_dir / "output.mp4").exists()
    error = (job_dir / "error.txt").exists()
    
    # Get progress info
    progress_info = {}
    progress_file = job_dir / "progress.txt"
    if progress_file.exists():
        try:
            lines = progress_file.read_text().strip().split('\n')
            for line in lines:
                if ':' in line:
                    key, value = line.split(':', 1)
                    progress_info[key.strip()] = value.strip()
        except Exception:
            pass
    
    files = [p.name for p in sorted(job_dir.iterdir())]
    
    return {
        "job_id": job_id,
        "exists": True,
        "ready": ready,
        "error": error,
        "status": current_status,
        "progress": progress_info,
        "files": files
    }

@app.get("/download/{job_id}")
def download(job_id: str):
    mp4 = OUT_DIR / job_id / "output.mp4"
    if not mp4.exists():
        raise HTTPException(status_code=404, detail="Output not ready")
    return FileResponse(path=str(mp4), media_type="video/mp4", filename=f"minecraft_{job_id}.mp4")

# ---------- Generation routine ----------
def run_generation(req_dict, outdir_str):
    outdir = Path(outdir_str)
    
    try:
        # Update status
        (outdir / "status.txt").write_text("checking_ffmpeg")
        ensure_ffmpeg()
        
        (outdir / "status.txt").write_text("initializing")
        
        prompt = req_dict["prompt"]
        length_seconds = int(req_dict.get("length_seconds", 20))
        fps = int(req_dict.get("fps", 8))
        width = int(req_dict.get("width", 512))
        height = int(req_dict.get("height", 512))
        seed = req_dict.get("seed", None)
        num_inference_steps = int(req_dict.get("num_inference_steps", 20))
        
        num_frames = length_seconds * fps
        logger.info(f"Generating {num_frames} frames for {length_seconds}s video at {fps} FPS")
        
        # Set seed
        base_seed = int(seed) if seed is not None else random.randint(0, 2**32-1)
        
        # Update status
        (outdir / "status.txt").write_text("generating_frames")
        
        # Enhanced prompt engineering for Minecraft style
        minecraft_style_prompt = f"minecraft style, voxel art, blocky, pixelated, {prompt}"
        
        # Generate frames in batches
        frames_dir = outdir / "frames"
        frames_dir.mkdir(exist_ok=True)
        
        for batch_start in range(0, num_frames, BATCH_SIZE):
            batch_end = min(batch_start + BATCH_SIZE, num_frames)
            batch_frames = batch_end - batch_start
            
            logger.info(f"Generating batch {batch_start}-{batch_end} ({batch_frames} frames)")
            
            # Create scene-based prompt variation
            scene_progress = batch_start / num_frames
            scene_prompts = create_scene_prompts(minecraft_style_prompt, scene_progress, length_seconds)
            
            for i in range(batch_frames):
                frame_idx = batch_start + i
                frame_progress = frame_idx / num_frames
                
                # Use scene-appropriate prompt
                current_prompt = interpolate_scene_prompt(scene_prompts, frame_progress)
                
                # Vary seed slightly for each frame
                frame_seed = base_seed + frame_idx
                generator = torch.Generator(device=DEVICE).manual_seed(frame_seed)
                
                try:
                    # Generate image
                    with torch.no_grad():
                        result = pipe(
                            current_prompt,
                            width=width,
                            height=height,
                            num_inference_steps=num_inference_steps,
                            generator=generator
                        )
                        image = result.images[0]
                    
                    # Save frame
                    frame_path = frames_dir / f"frame_{frame_idx:06d}.png"
                    image.save(frame_path)
                    
                    # Update progress
                    progress_text = f"frames_generated: {frame_idx + 1}\ntotal_frames: {num_frames}\nprogress_percent: {((frame_idx + 1) / num_frames) * 100:.1f}"
                    (outdir / "progress.txt").write_text(progress_text)
                    
                    logger.info(f"Generated frame {frame_idx + 1}/{num_frames}")
                    
                except Exception as e:
                    logger.error(f"Error generating frame {frame_idx}: {e}")
                    # Continue with next frame
                    continue
            
            # Clear GPU memory between batches
            if DEVICE == "cuda":
                torch.cuda.empty_cache()
        
        # Update status
        (outdir / "status.txt").write_text("assembling_video")
        
        # Create video using ffmpeg
        video_path = outdir / "output.mp4"
        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", str(frames_dir / "frame_%06d.png"),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "18",  # Good quality
            str(video_path)
        ]
        
        logger.info(f"Running ffmpeg: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            error_msg = f"FFmpeg failed: {result.stderr}"
            logger.error(error_msg)
            (outdir / "error.txt").write_text(error_msg)
            (outdir / "status.txt").write_text("error")
            return
        
        # Clean up frames to save space
        shutil.rmtree(frames_dir)
        
        # Update final status
        (outdir / "status.txt").write_text("completed")
        final_progress = f"frames_generated: {num_frames}\ntotal_frames: {num_frames}\nprogress_percent: 100.0\nstatus: Video generation completed successfully"
        (outdir / "progress.txt").write_text(final_progress)
        
        logger.info(f"Video generation completed: {video_path}")
        
    except Exception as e:
        error_msg = f"Generation failed: {str(e)}"
        logger.error(error_msg)
        (outdir / "error.txt").write_text(error_msg)
        (outdir / "status.txt").write_text("error")

def create_scene_prompts(base_prompt, scene_progress, length_seconds):
    """Create varied prompts for different scenes in the video"""
    # Divide video into 4 scenes for better narrative flow
    scenes = [
        f"beginning scene, {base_prompt}, starting adventure",
        f"middle scene, {base_prompt}, exploring deeper",
        f"action scene, {base_prompt}, intense moment",
        f"ending scene, {base_prompt}, conclusion"
    ]
    return scenes

def interpolate_scene_prompt(scene_prompts, progress):
    """Get appropriate prompt based on video progress (0.0 to 1.0)"""
    scene_count = len(scene_prompts)
    scene_index = min(int(progress * scene_count), scene_count - 1)
    return scene_prompts[scene_index]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)