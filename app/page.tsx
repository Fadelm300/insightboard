import Link from "next/link";

const stats = [
  { label: "Focus", value: "Front-End" },
  { label: "Stack", value: "Full-Stack" },
  { label: "CRM", value: "Private" },
];

const features = [
  {
    title: "Client Management",
    description:
      "Organize client profiles, contact details, business status, and project relationships.",
  },
  {
    title: "Deals Pipeline",
    description:
      "Track leads, proposals, negotiations, closed deals, and conversion performance.",
  },
  {
    title: "Project Control",
    description:
      "Manage active projects, pricing, cost, profit, status, and delivery progress.",
  },
  {
    title: "Finance Tracking",
    description:
      "Monitor revenue, expenses, profit margins, and business performance in one place.",
  },
];

const techStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "Express",
  "MongoDB",
  "MUI",
  "Tailwind CSS",
  "JWT Auth",
  "Postman",
  "Git",
  "AWS",
];

const projects = [
  "InsightBoard CRM Dashboard",
  "UniClub MERN Application",
  "Employee Management System",
  "Smart Traffic Camera System",
  "Pharmacy Management System",
  "Flutter Quiz App",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-18px) scale(1.03); }
        }

        @keyframes borderWave {
          0% { transform: rotate(0deg); opacity: 0.65; }
          50% { opacity: 1; }
          100% { transform: rotate(360deg); opacity: 0.65; }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }

        .floating-orb {
          animation: floatSlow 7s ease-in-out infinite;
        }

        .premium-card::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 34px;
          background: conic-gradient(
            from 180deg,
            transparent,
            rgba(56, 189, 248, 0.9),
            rgba(99, 102, 241, 0.8),
            rgba(14, 165, 233, 0.9),
            transparent
          );
          animation: borderWave 9s linear infinite;
          z-index: 0;
        }

        .premium-card::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: 32px;
          background: rgba(5, 8, 22, 0.88);
          backdrop-filter: blur(22px);
          z-index: 1;
        }

        .glow-pulse {
          animation: pulseGlow 4s ease-in-out infinite;
        }
      `}</style>

      <section className="relative min-h-screen px-6 py-8 lg:px-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,rgba(37,99,235,0.18),transparent_35%,rgba(14,165,233,0.12)_70%,transparent)]" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[150px]" />
        <div className="floating-orb absolute right-10 top-24 h-52 w-52 rounded-full bg-cyan-400/20 blur-[80px]" />
        <div className="floating-orb absolute bottom-20 left-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-[100px]" />

        <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-lg font-black shadow-lg shadow-blue-500/30">
              IB
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">InsightBoard</p>
              <p className="text-xs text-slate-400">Private CRM System</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#stack" className="transition hover:text-white">
              Stack
            </a>
          </div>

          <Link
            href="/login"
className="rounded-2xl border border-cyan-300/30 bg-blue-500/20 px-5 py-2.5 text-sm font-bold text-cyan-100 shadow-lg shadow-blue-500/20 backdrop-blur-xl transition hover:border-cyan-200/60 hover:bg-blue-500/30 hover:text-white"          >
            Login
          </Link>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 shadow-lg shadow-blue-500/10">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,1)]" />
              Built by Fadel Mohammad Fadel
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              A premium CRM dashboard for sharper business decisions.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              InsightBoard is my private CRM system for managing clients, deals,
              projects, revenue, expenses, and reports through one clean,
              secure, and business-focused dashboard.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login"
                className="rounded-2xl bg-blue-500 px-7 py-4 text-center text-sm font-bold text-white shadow-2xl shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                Enter Admin Portal
              </Link>

              <a
                href="#about"
                className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-center text-sm font-bold text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                About The Builder
              </a>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl"
                >
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-white md:text-base">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card relative min-h-[560px] overflow-hidden rounded-[34px] p-[2px] shadow-[0_0_80px_rgba(37,99,235,0.22)]">
            <div className="relative z-10 h-full rounded-[32px] p-6 md:p-8">
              <div className="glow-pulse absolute right-10 top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-[60px]" />
              <div className="absolute left-8 top-8 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-200">
                LIVE CRM VIEW
              </div>

              <div className="mt-16 rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Business Health</p>
                    <p className="mt-1 text-3xl font-black">92%</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300">
                    Strong
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-indigo-400 shadow-[0_0_25px_rgba(56,189,248,0.7)]" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                  <p className="text-xs text-slate-400">Revenue</p>
                  <p className="mt-2 text-2xl font-black">BHD 8.4K</p>
                  <p className="mt-2 text-xs text-emerald-300">+18% growth</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                  <p className="text-xs text-slate-400">Projects</p>
                  <p className="mt-2 text-2xl font-black">12</p>
                  <p className="mt-2 text-xs text-cyan-300">4 active</p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.05] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-bold">Pipeline Overview</p>
                  <p className="text-xs text-slate-400">Monthly</p>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Lead", width: "w-[72%]" },
                    { label: "Proposal", width: "w-[58%]" },
                    { label: "Negotiation", width: "w-[44%]" },
                    { label: "Closed Won", width: "w-[82%]" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex justify-between text-xs text-slate-400">
                        <span>{item.label}</span>
                        <span>{item.width.replace("w-[", "").replace("%]", "%")}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className={`${item.width} h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_18px_rgba(56,189,248,0.45)]`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-7 left-6 right-6 rounded-3xl border border-blue-300/20 bg-blue-500/10 p-5 backdrop-blur-xl">
                <p className="text-sm font-bold text-blue-100">
                  Secure single-admin CRM access
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Built for private business management with protected routes,
                  JWT authentication, and controlled admin registration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
              About Me
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Software engineer focused on clean interfaces and practical
              systems.
            </h2>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-7 backdrop-blur-xl md:p-9">
            <p className="text-lg leading-9 text-slate-300">
              I am Fadel Mohammad Fadel, a Bahraini software engineer with a
              strong focus on front-end development, design, and full-stack web
              systems. I build reliable, secure, and visually polished
              applications using modern tools like React, Next.js, TypeScript,
              Node.js, and MongoDB.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-[#07111f] p-5">
                <p className="text-sm font-bold text-white">Role</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Software Engineer
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#07111f] p-5">
                <p className="text-sm font-bold text-white">Strength</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Front-End + Full-Stack
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#07111f] p-5">
                <p className="text-sm font-bold text-white">Mindset</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Secure, practical, polished
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://fadelprofile.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-bold shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
              >
                View Portfolio
              </a>

             
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
              InsightBoard
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Built to manage the full business workflow from lead to profit.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group rounded-[30px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-blue-300/40 hover:bg-white/[0.07] hover:shadow-[0_0_45px_rgba(37,99,235,0.18)]"
              >
                <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-black text-cyan-200 ring-1 ring-blue-300/20">
                  0{index + 1}
                </div>
                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stack" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-7 backdrop-blur-xl md:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
              Tech Stack
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight">
              Modern tools for a secure, scalable dashboard.
            </h2>

            <div className="mt-8 flex flex-wrap gap-3">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-slate-200"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-7 backdrop-blur-xl md:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
              Project Experience
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight">
              Systems, dashboards, cloud projects, and full-stack apps.
            </h2>

            <div className="mt-8 space-y-3">
              {projects.map((project) => (
                <div
                  key={project}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
                  <p className="text-sm font-semibold text-slate-200">
                    {project}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-blue-300/20 bg-gradient-to-br from-blue-500/15 via-white/[0.06] to-cyan-400/10 p-8 shadow-[0_0_90px_rgba(37,99,235,0.2)] backdrop-blur-xl md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                Private Access
              </p>
              <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                Continue to the secure InsightBoard admin dashboard.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                The dashboard is designed for private use, protected access, and
                clean business management from one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/login"
  className="rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-blue-500 to-indigo-500 px-7 py-4 text-center text-sm font-black text-white shadow-2xl shadow-blue-500/30 transition hover:-translate-y-0.5 hover:from-blue-400 hover:to-cyan-400"
              >
                Login
              </Link>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-center text-sm font-black text-white transition hover:bg-white/15"
              >
                Go Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}