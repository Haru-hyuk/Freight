import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 -top-32 h-[24rem] bg-gradient-to-br from-primary/75 via-accent/60 to-background/45" />
        <div className="absolute -right-36 top-16 h-[24rem] w-[42rem] rotate-[-10deg] rounded-[2.5rem] border border-border/50 bg-background/70 backdrop-blur-sm" />
        <div className="absolute -left-20 bottom-[-5rem] h-[20rem] w-[30rem] rotate-[8deg] rounded-[2.5rem] border border-border/50 bg-secondary/70" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-background/85 p-8 shadow-xl backdrop-blur">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
