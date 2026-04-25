import { useRef, useEffect, useState, useCallback } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_SIZE = 30;
const GRAVITY = 0.18;
const JUMP_FORCE = -4.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_INTERVAL = 110;
const GROUND_HEIGHT = 60;

interface Bird {
  x: number;
  y: number;
  velocity: number;
  rotation: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  scored: boolean;
}

type GameState = "idle" | "playing" | "dead";

const FlappyBird = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>("idle");
  const birdRef = useRef<Bird>({ x: 80, y: 250, velocity: 0, rotation: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const bestScoreRef = useRef(Number(localStorage.getItem("flappy-best") || "0"));
  const frameCountRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  const [displayState, setDisplayState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(bestScoreRef.current);

  const resetGame = useCallback(() => {
    birdRef.current = { x: 80, y: 250, velocity: 0, rotation: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    frameCountRef.current = 0;
    setScore(0);
  }, []);

  const jump = useCallback(() => {
    if (gameStateRef.current === "idle") {
      gameStateRef.current = "playing";
      setDisplayState("playing");
      resetGame();
      birdRef.current.velocity = JUMP_FORCE;
    } else if (gameStateRef.current === "playing") {
      birdRef.current.velocity = JUMP_FORCE;
    } else {
      gameStateRef.current = "idle";
      setDisplayState("idle");
      resetGame();
    }
  }, [resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const drawBird = (bird: Bird) => {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      const angle = Math.min(Math.max(bird.rotation, -30), 70) * (Math.PI / 180);
      ctx.rotate(angle);

      // Body
      ctx.fillStyle = "#f5c542";
      ctx.beginPath();
      ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#8B6914";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Wing
      ctx.fillStyle = "#e6a817";
      ctx.beginPath();
      ctx.ellipse(-4, 4, 10, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8, -5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(10, -5, 3, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = "#e85d3a";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(22, 3);
      ctx.lineTo(14, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const drawPipe = (pipe: Pipe) => {
      const bottomY = pipe.topHeight + PIPE_GAP;

      // Top pipe
      ctx.fillStyle = "#3a8c3f";
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.fillStyle = "#2d6e31";
      ctx.fillRect(pipe.x - 4, pipe.topHeight - 26, PIPE_WIDTH + 8, 26);
      ctx.strokeStyle = "#1a4a1d";
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x - 4, pipe.topHeight - 26, PIPE_WIDTH + 8, 26);

      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(pipe.x + 6, 0, 8, pipe.topHeight - 26);

      // Bottom pipe
      ctx.fillStyle = "#3a8c3f";
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY - GROUND_HEIGHT);
      ctx.fillStyle = "#2d6e31";
      ctx.fillRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 26);
      ctx.strokeStyle = "#1a4a1d";
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, CANVAS_HEIGHT - bottomY - GROUND_HEIGHT);
      ctx.strokeRect(pipe.x - 4, bottomY, PIPE_WIDTH + 8, 26);

      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(pipe.x + 6, bottomY + 26, 8, CANVAS_HEIGHT - bottomY - GROUND_HEIGHT - 26);
    };

    const drawBackground = () => {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT - GROUND_HEIGHT);
      grad.addColorStop(0, "#87CEEB");
      grad.addColorStop(1, "#c8e6f0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      const drawCloud = (x: number, y: number, s: number) => {
        ctx.beginPath();
        ctx.arc(x, y, 20 * s, 0, Math.PI * 2);
        ctx.arc(x + 15 * s, y - 10 * s, 15 * s, 0, Math.PI * 2);
        ctx.arc(x + 30 * s, y, 18 * s, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCloud(60, 80, 1);
      drawCloud(220, 120, 0.8);
      drawCloud(340, 60, 0.7);
    };

    const drawGround = () => {
      ctx.fillStyle = "#8B6B3D";
      ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = "#7CCC3F";
      ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, 16);
      ctx.strokeStyle = "#5a9e2d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT - GROUND_HEIGHT + 16);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_HEIGHT + 16);
      ctx.stroke();
    };

    const drawScore = () => {
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 4;
      ctx.font = "32px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      const text = String(scoreRef.current);
      ctx.strokeText(text, CANVAS_WIDTH / 2, 60);
      ctx.fillText(text, CANVAS_WIDTH / 2, 60);
    };

    const checkCollision = (bird: Bird, pipes: Pipe[]) => {
      if (bird.y + BIRD_SIZE / 2 > CANVAS_HEIGHT - GROUND_HEIGHT || bird.y - BIRD_SIZE / 2 < 0) return true;
      for (const pipe of pipes) {
        if (
          bird.x + BIRD_SIZE / 2.5 > pipe.x &&
          bird.x - BIRD_SIZE / 2.5 < pipe.x + PIPE_WIDTH
        ) {
          if (bird.y - BIRD_SIZE / 2.5 < pipe.topHeight || bird.y + BIRD_SIZE / 2.5 > pipe.topHeight + PIPE_GAP) {
            return true;
          }
        }
      }
      return false;
    };

    const loop = () => {
      drawBackground();

      const state = gameStateRef.current;
      const bird = birdRef.current;
      const pipes = pipesRef.current;

      if (state === "playing") {
        frameCountRef.current++;
        bird.velocity += GRAVITY;
        bird.y += bird.velocity;
        bird.rotation = bird.velocity * 4;

        if (frameCountRef.current % PIPE_SPAWN_INTERVAL === 0) {
          const topH = 60 + Math.random() * (CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 120);
          pipes.push({ x: CANVAS_WIDTH, topHeight: topH, scored: false });
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
          pipes[i].x -= PIPE_SPEED;
          if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
            continue;
          }
          if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < bird.x) {
            pipes[i].scored = true;
            scoreRef.current++;
            setScore(scoreRef.current);
          }
        }

        if (checkCollision(bird, pipes)) {
          gameStateRef.current = "dead";
          setDisplayState("dead");
          if (scoreRef.current > bestScoreRef.current) {
            bestScoreRef.current = scoreRef.current;
            localStorage.setItem("flappy-best", String(scoreRef.current));
            setBestScore(scoreRef.current);
          }
        }
      } else if (state === "idle") {
        bird.y = 250 + Math.sin(Date.now() / 300) * 12;
        bird.rotation = 0;
      }

      pipes.forEach(drawPipe);
      drawGround();
      drawBird(bird);

      if (state === "playing" || state === "dead") {
        drawScore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [jump]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 select-none bg-background">
      <h1 className="text-xl sm:text-2xl text-foreground tracking-wider">Flappy Bird</h1>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={jump}
          onTouchStart={(e) => { e.preventDefault(); jump(); }}
          className="rounded-lg border-4 border-border cursor-pointer shadow-xl"
          style={{ maxWidth: "100vw", maxHeight: "80vh" }}
        />

        {displayState === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
            <p className="text-sm text-accent bg-foreground/70 px-4 py-2 rounded-md">
              Tap or press Space
            </p>
          </div>
        )}

        {displayState === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm border-2 border-border rounded-xl px-8 py-6 flex flex-col items-center gap-3">
              <p className="text-destructive text-lg">Game Over</p>
              <p className="text-foreground text-xs">Score: {score}</p>
              <p className="text-muted-foreground text-xs">Best: {bestScore}</p>
              <p className="text-xs text-accent mt-2">Tap to restart</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Best: {bestScore}</p>
    </div>
  );
};

export default FlappyBird;
