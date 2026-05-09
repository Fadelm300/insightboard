"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Language = "en" | "ar";
type ThemeMode = "dark" | "light";

const EMAIL = "fadel.m200@gmail.com";
const PORTFOLIO_CONTACT = "https://fadelprofile.vercel.app/#contact";

const techStack = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "MongoDB",
  "Mongoose",
  "MUI",
  "Tailwind CSS",
  "JWT Auth",
  "Recharts",
  "Postman",
  "Git",
];
const previewScreenshots = [
  {
    light: "/images/Screenshot/Dashboard_img_1.png",
    dark: "/images/Screenshot/Dashboard_img_1_dark.png",
  },
  {
    light: "/images/Screenshot/Clients_img.png",
  },
  {
    light: "/images/Screenshot/Deals_img.png",
  },
  {
    light: "/images/Screenshot/Projects_img.png",
  },
  {
    light: "/images/Screenshot/Revenue_img.png",
  },
  {
    light: "/images/Screenshot/Expenses_img.png",
  },
  {
    light: "/images/Screenshot/Reports_img_1.png",
    dark: "/images/Screenshot/Reports_img_1_dark.png",
  },
  {
    light: "/images/Screenshot/Settings_img.png",
    dark: "/images/Screenshot/Settings_img_dark.png",
  },
];
const content = {
  en: {
    nav: {
      features: "Features",
      preview: "Preview",
      stack: "Stack",
      builder: "Builder",
      contact: "Contact",
      login: "Login",
      system: "Private CRM System",
      themeLight: "Light",
      themeDark: "Dark",
      lang: "AR",
    },
    hero: {
      badge: "InsightBoard · Private CRM System · Built by Fadel Mohammad Fadel",
      title: "A premium CRM dashboard for sharper business decisions.",
      description:
        "InsightBoard is a private CRM system built to turn daily business activity into clear decisions. It helps manage clients, deals, projects, revenue, expenses, and performance reports from one secure dashboard instead of scattered files, notes, and manual tracking.",
      sub:
        "From lead tracking to profit visibility, InsightBoard keeps the full business workflow organized, measurable, and under control.",
      enter: "Enter Admin Portal",
      contact: "Contact / View Portfolio",
    },
    stats: [
      { label: "Clients", value: "Organized records" },
      { label: "Deals", value: "Deal tracking" },
      { label: "Finance", value: "Profit visibility" },
    ],
    crm: {
      live: "CRM DASHBOARD PREVIEW",
      health: "Business Overview",
      strong: "Strong",
      revenue: "Revenue",
      growth: "+18% growth",
      projects: "Projects",
      active: "4 active projects",
      pipeline: "Deal Overview",
      monthly: "Snapshot",
      clarityTitle: "Business clarity from one place",
      clarityText:
        "InsightBoard connects clients, deals, projects, and finance into one workflow so decisions are based on real business data, not scattered notes.",
      pipelineItems: [
        { label: "Lead", percent: "72%" },
        { label: "Proposal", percent: "58%" },
        { label: "Negotiation", percent: "44%" },
        { label: "Closed Won", percent: "82%" },
      ],
    },
    features: {
      label: "InsightBoard",
      heading: "Built to manage the full business workflow from lead to profit.",
      text:
        "The system is structured around the real flow of a small business: capturing clients, tracking deals, managing project delivery, monitoring financial movement, and reviewing performance through clear reports.",
      items: [
        {
          title: "Client Management",
          description:
            "Keep client profiles, contact details, project history, and business status organized in one place.",
          outcome: "Better control",
        },
        {
          title: "Deal Pipeline",
          description:
            "Track leads, proposals, negotiations, and closed deals with a clear view of sales progress.",
          outcome: "Sharper follow-up",
        },
        {
          title: "Project Delivery",
          description:
            "Manage project status, pricing, cost, profit, deadlines, and delivery progress without losing context.",
          outcome: "Cleaner execution",
        },
        {
          title: "Finance Overview",
          description:
            "Monitor revenue, expenses, profit margin, and business performance to understand where the business is heading.",
          outcome: "Profit clarity",
        },
        {
          title: "Reports & Insights",
          description:
            "Turn CRM data into useful summaries that support better planning, faster review, and stronger decisions.",
          outcome: "Data-driven decisions",
        },
        {
          title: "Secure Admin Access",
          description:
            "Protect sensitive business data through private admin access, authentication, and controlled dashboard routes.",
          outcome: "Private by design",
        },
      ],
    },
    preview: {
      label: "Dashboard Preview",
      heading: "A quick look at the main InsightBoard modules.",
      text:
        "Explore how InsightBoard brings clients, deals, projects, finance, and reports into one clear business dashboard.",
      badge: "Auto-scrolling showcase",
      replace: "Dashboard interface preview.",
      previewLabel: "Preview",
      items: [
        "Dashboard Overview",
        "Clients Page",
        "Deals Pipeline",
        "Projects Management",
        "Revenue Tracking",
        "Expenses Tracking",
        "Reports Page",
        "Admin Access",
      ],
    },
    stack: {
      label: "Engineering Foundation",
      heading: "Built with a modern TypeScript-based stack.",
      text:
        "InsightBoard is built with a modern stack focused on performance, maintainability, protected access, database-driven workflows, and a clean dashboard experience.",
    },
    product: {
      label: "Product Mindset",
      heading: "Designed as a real business tool, not just a UI concept.",
      text:
        "InsightBoard combines clean interface design, protected backend logic, database modeling, and practical CRM features that support daily business operations.",
      points: [
        "Protected dashboard routes",
        "CRM API structure",
        "Database-backed business records",
        "Clean SaaS-style user interface",
      ],
    },
    builder: {
      label: "Builder",
      heading: "Built by Fadel Mohammad Fadel.",
      text:
        "I am a Bahraini software engineer focused on building clean, secure, and practical web systems. InsightBoard reflects my work across front-end design, full-stack development, business logic, API integration, database modeling, and modern dashboard UI.",
      cards: [
        {
          title: "Front-End Focus",
          description:
            "Modern interfaces with strong visual hierarchy, responsive layouts, and clean user experience.",
        },
        {
          title: "Full-Stack Build",
          description:
            "API routes, authentication, database models, validation, and protected workflows.",
        },
        {
          title: "Business-Oriented Thinking",
          description:
            "Features designed around real CRM needs: clients, deals, projects, finance, and reporting.",
        },
      ],
    },
    contact: {
      label: "Contact & Private Access",
      heading: "Access the admin portal or contact the builder.",
      text:
        "InsightBoard is designed as a private CRM system. Public visitors can review the concept and contact the builder, while only authorized admin users can access the dashboard.",
      enter: "Enter Admin Portal",
      email: "Email Me",
      portfolio: "View Portfolio Contact Page",
    },
    footer: {
      rights:
        "© 2026 InsightBoard. Built by Fadel Mohammad Fadel. All rights reserved.",
      made: "Private CRM system · Made in Bahrain",
      portfolio: "Portfolio",
      admin: "Admin Login",
      contact: "Contact",
    },
  },

  ar: {
    nav: {
      features: "الخصائص",
      preview: "استعراض النظام",
      stack: "التقنيات المستخدمة",
      builder: "عن المطور",
      contact: "تواصل",
      login: "تسجيل الدخول",
      system: "نظام إدارة علاقات العملاء",
      themeLight: "الوضع الفاتح",
      themeDark: "الوضع الداكن",
      lang: "EN",
    },
    hero: {
      badge: "InsightBoard · نظام CRM خاص · تطوير فاضل محمد فاضل",
      title: "لوحة إدارة أعمال تساعدك على فهم نشاطك واتخاذ قرارات أفضل",
      description:
        "InsightBoard هو نظام خاص لإدارة علاقات العملاء صُمم لتنظيم العمل اليومي وتحويله إلى قرارات أوضح، من خلال جمع العملاء، الصفقات، المشاريع، الإيرادات، المصروفات، والتقارير داخل لوحة واحدة آمنة بدل الاعتماد على ملفات وملاحظات متفرقة.",
      sub:
  "من أول عميل محتمل إلى وضوح الربح، يساعدك InsightBoard على تنظيم سير العمل بالكامل وقياسه والتحكم فيه من مكان واحد.",
      enter: "دخول لوحة الإدارة",
      contact: "تواصل / عرض البورتفوليو",
    },
    stats: [
      { label: "العملاء", value: "سجلات منظمة" },
      { label: "الصفقات", value: "متابعة الصفقات" },
      { label: "المالية", value: "رؤية أوضح للربح" },
    ],
    crm: {
      live: "معاينة لوحة التحكم",
      health: "نظرة عامة على العمل",
      strong: "قوي",
      revenue: "الإيرادات",
      growth: "+18% نمو",
      projects: "المشاريع",
      active: "4 مشاريع نشطة",
      pipeline: "نظرة على الصفقات",
      monthly: "معاينة",
      clarityTitle: "وضوح العمل من مكان واحد",
      clarityText:
        "يربط InsightBoard العملاء والصفقات والمشاريع والمالية في سير عمل واحد حتى تكون القرارات مبنية على بيانات واضحة، وليس ملاحظات متفرقة.",
      pipelineItems: [
        { label: "عميل محتمل", percent: "72%" },
        { label: "عرض سعر", percent: "58%" },
        { label: "تفاوض", percent: "44%" },
        { label: "صفقات ناجحة", percent: "82%" },
      ],
    },
    features: {
      label: "InsightBoard",
    heading: "مصمم لإدارة سير العمل بالكامل من العميل المحتمل إلى الربح.",
      text:
        "النظام مبني حول سير العمل الحقيقي للأعمال الصغيرة: تسجيل العملاء، متابعة الصفقات، إدارة تسليم المشاريع، مراقبة الحركة المالية، ومراجعة الأداء من خلال تقارير واضحة.",
      items: [
        {
          title: "إدارة العملاء",
          description:
            "تنظيم بيانات العملاء، معلومات التواصل، تاريخ المشاريع، وحالة العلاقة التجارية في مكان واحد.",
          outcome: "تحكم أفضل",
        },
        {
          title: "متابعة الصفقات",
          description:
            "متابعة العملاء المحتملين، العروض، التفاوض، والصفقات المغلقة مع رؤية واضحة لتقدم المبيعات.",
          outcome: "متابعة أدق",
        },
        {
          title: "إدارة المشاريع",
          description:
            "متابعة حالة المشروع، السعر، التكلفة، الربح، المواعيد، ونسبة التقدم بدون ضياع التفاصيل.",
          outcome: "تنفيذ أنظف",
        },
        {
          title: "نظرة مالية",
          description:
            "مراقبة الإيرادات، المصروفات، هامش الربح، وأداء العمل لفهم الاتجاه المالي بوضوح.",
          outcome: "وضوح الربح",
        },
        {
          title: "تقارير ورؤى",
          description:
            "تحويل بيانات النظام إلى ملخصات مفيدة تساعد على التخطيط والمراجعة واتخاذ قرارات أفضل.",
          outcome: "قرارات مبنية على بيانات",
        },
        {
          title: "دخول إداري آمن",
          description:
            "حماية بيانات العمل الحساسة من خلال دخول خاص، مصادقة، وصفحات محمية داخل لوحة التحكم.",
          outcome: "خاص وآمن",
        },
      ],
    },
    preview: {
      label: "عرض النظام",
      heading: "نظرة سريعة على أهم أقسام InsightBoard.",
text:
  "نظرة واضحة على أهم أقسام النظام، من لوحة التحكم والعملاء إلى الصفقات، المشاريع، المالية، والتقارير.",
      badge: "شريط عرض متحرك",
      replace: "معاينة من واجهات النظام.",
      previewLabel: "عرض",
      items: [
        "لوحة التحكم",
        "صفحة العملاء",
        "صفحة الصفقات",
        "إدارة المشاريع",
        "تتبع الإيرادات",
        "تتبع المصروفات",
        "صفحة التقارير",
        "دخول الإدارة",
      ],
    },
    stack: {
      label: "الأساس التقني",
      heading: "مبني بتقنيات حديثة تعتمد على TypeScript",
      text:
        "تم بناء InsightBoard بتركيز على الأداء، سهولة الصيانة، حماية الوصول، ربط البيانات بقاعدة بيانات فعلية، وتجربة لوحة تحكم نظيفة وعملية.",
    },
    product: {
      label: "فكر عملي في بناء المنتج",
      heading: "مبني ليكون أداة عمل حقيقية، وليس مجرد تصميم واجهة",
      text:
        "يجمع InsightBoard بين تصميم واجهات واضح، منطق خلفي محمي، نمذجة قواعد البيانات، ومميزات CRM عملية تخدم إدارة العمل اليومية.",
      points: [
        "حماية صفحات لوحة التحكم",
        "هيكلة API خاصة بالـ CRM",
        "بيانات عمل محفوظة في قاعدة بيانات",
        "واجهة SaaS نظيفة وعصرية",
      ],
    },
    builder: {
      label: "المطور",
      heading: "تطوير فاضل محمد فاضل",
  text:
  "أنا مهندس برمجيات بحريني أركز على بناء أنظمة ويب نظيفة، آمنة، وعملية. يعكس InsightBoard خبرتي في تصميم الواجهات، تطوير الأنظمة الكاملة، منطق الأعمال، ربط الـ API، تصميم قواعد البيانات، وتطوير لوحات التحكم الحديثة.",
   cards: [
        {
          title: "تركيز على الواجهات",
          description:
            "واجهات حديثة بتسلسل بصري واضح، تصميم متجاوب، وتجربة استخدام مرتبة.",
        },
        {
          title: "بناء Full-Stack",
          description:
            "API routes، مصادقة، نماذج قواعد بيانات، تحقق من البيانات، وسير عمل محمي.",
        },
        {
          title: "تفكير تجاري عملي",
          description:
            "مميزات مبنية حول احتياجات CRM حقيقية: عملاء، صفقات، مشاريع، مالية، وتقارير.",
        },
      ],
    },
    contact: {
      label: "تواصل ودخول خاص",
      heading: "ادخل إلى لوحة الإدارة أو تواصل مع المطور.",
   text:
  "InsightBoard مصمم كنظام CRM خاص. يستطيع الزائر التعرف على فكرة النظام والتواصل مع المطور، مع إمكانية تجربة دخول محدود عبر الوضع التجريبي، بينما تبقى لوحة التحكم الكاملة متاحة فقط للمستخدمين المصرح لهم.",
     enter: "دخول لوحة الإدارة",
      email: "راسلني بالإيميل",
      portfolio: "صفحة التواصل في البورتفوليو",
    },
    footer: {
      rights: "© 2026 InsightBoard. تطوير فاضل محمد فاضل. جميع الحقوق محفوظة.",
      made: "نظام CRM خاص · صُنع في البحرين",
      portfolio: "البورتفوليو",
      admin: "دخول الإدارة",
      contact: "تواصل",
    },
  },
};

export default function HomePage() {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<ThemeMode>("dark");

  const t = content[language];

const marqueeItems = useMemo(() => {
  const items = t.preview.items.map((title, index) => {
    const screenshot = previewScreenshots[index];

    return {
      title,
      image:
        theme === "dark" && screenshot?.dark
          ? screenshot.dark
          : screenshot?.light,
    };
  });

  return [...items, ...items];
}, [t.preview.items, theme]);

useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeMode | null;
    const savedLanguage = localStorage.getItem("language") as Language | null;

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    if (savedLanguage === "en" || savedLanguage === "ar") {
      setLanguage(savedLanguage);
      document.documentElement.lang = savedLanguage;
      document.documentElement.dir = savedLanguage === "ar" ? "rtl" : "ltr";
    }
  }, 0);

  return () => window.clearTimeout(timeoutId);
}, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleThemeChange = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleLanguageChange = () => {
    const nextLanguage = language === "en" ? "ar" : "en";

    setLanguage(nextLanguage);
    localStorage.setItem("language", nextLanguage);
  };

  return (
    <main
      data-theme={theme}
      dir={language === "ar" ? "rtl" : "ltr"}
      className="landing-page min-h-screen overflow-hidden bg-[var(--ib-bg)] text-[var(--ib-text)]"
    >
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        .landing-page {
          --ib-bg: #f8fafc;
          --ib-text: #0f172a;
          --ib-muted: #475569;
          --ib-soft: rgba(15, 23, 42, 0.06);
          --ib-card: rgba(255, 255, 255, 0.78);
          --ib-card-strong: rgba(255, 255, 255, 0.94);
          --ib-border: rgba(15, 23, 42, 0.12);
          --ib-solid-card: #ffffff;
          --ib-nav: rgba(255, 255, 255, 0.78);
          --ib-preview-card: #ffffff;
          --ib-pill-bg: rgba(37, 99, 235, 0.1);
          --ib-pill-text: #1e40af;
          --ib-accent-text: #0369a1;
          --ib-track: rgba(15, 23, 42, 0.1);
          --ib-hero-overlay: linear-gradient(to bottom right, rgba(37,99,235,0.12), transparent 35%, rgba(14,165,233,0.1) 70%, transparent);
          --ib-premium-inner: rgba(255, 255, 255, 0.72);
          --ib-glow-soft: rgba(56, 189, 248, 0.14);
        }

        .landing-page[data-theme="dark"] {
          --ib-bg: #050816;
          --ib-text: #ffffff;
          --ib-muted: #94a3b8;
          --ib-soft: rgba(255, 255, 255, 0.05);
          --ib-card: rgba(255, 255, 255, 0.05);
          --ib-card-strong: rgba(255, 255, 255, 0.08);
          --ib-border: rgba(255, 255, 255, 0.1);
          --ib-solid-card: #07111f;
          --ib-nav: rgba(255, 255, 255, 0.04);
          --ib-preview-card: #07111f;
          --ib-pill-bg: rgba(14, 165, 233, 0.12);
          --ib-pill-text: #bae6fd;
          --ib-accent-text: #67e8f9;
          --ib-track: rgba(255, 255, 255, 0.1);
          --ib-hero-overlay: linear-gradient(to bottom right, rgba(37,99,235,0.18), transparent 35%, rgba(14,165,233,0.12) 70%, transparent);
          --ib-premium-inner: rgba(5, 8, 22, 0.82);
          --ib-glow-soft: rgba(56, 189, 248, 0.16);
        }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-18px) scale(1.03); }
        }

        @keyframes borderWave {
          0% { transform: rotate(0deg); opacity: 0.38; }
          50% { opacity: 0.68; }
          100% { transform: rotate(360deg); opacity: 0.38; }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.24; transform: scale(1); }
          50% { opacity: 0.48; transform: scale(1.04); }
        }

        @keyframes marqueeMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

   .preview-marquee {
        width: max-content;
        direction: ltr;
        animation: marqueeMove 46s linear infinite;
        will-change: transform;
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
            rgba(56, 189, 248, 0.45),
            rgba(99, 102, 241, 0.42),
            rgba(14, 165, 233, 0.45),
            transparent
          );
          animation: borderWave 12s linear infinite;
          z-index: 0;
        }

        .premium-card::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: 32px;
          background: var(--ib-premium-inner);
          backdrop-filter: blur(22px);
          z-index: 1;
        }

        .glow-pulse {
          animation: pulseGlow 5s ease-in-out infinite;
        }

        .preview-marquee {
          width: max-content;
          animation: marqueeMove 46s linear infinite;
        }

        .preview-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      <section className="relative min-h-screen px-6 py-8 lg:px-10">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "var(--ib-hero-overlay)" }}
        />
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[150px]" />
        <div className="floating-orb absolute right-10 top-24 h-52 w-52 rounded-full bg-cyan-400/15 blur-[90px]" />
        <div className="floating-orb absolute bottom-20 left-10 h-64 w-64 rounded-full bg-indigo-500/15 blur-[110px]" />

        <nav className="relative z-20 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-nav)] px-5 py-4 backdrop-blur-xl">
          {/* <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500 text-lg font-black text-white shadow-lg shadow-blue-500/25">
              IB
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">InsightBoard</p>
              <p className="text-xs text-[var(--ib-muted)]">{t.nav.system}</p>
            </div>
          </Link> */}
<Link href="/" className="flex min-w-0 items-center">
  <Image
    src="/images/logo/insightboard-logo-1.png"
    alt="InsightBoard Logo"
    width={240}
    height={60}
    priority
    className="h-10 w-auto max-w-[170px] object-contain sm:h-12 sm:max-w-[210px] lg:h-14 lg:max-w-[250px]"
  />
</Link>
          <div className="hidden items-center gap-6 text-sm text-[var(--ib-muted)] md:flex">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.nav.features}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("preview")}
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.nav.preview}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("stack")}
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.nav.stack}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("builder")}
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.nav.builder}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.nav.contact}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLanguageChange}
              className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-4 py-2.5 text-sm font-bold transition hover:border-cyan-300/50"
            >
              {t.nav.lang}
            </button>

            <button
              type="button"
              onClick={handleThemeChange}
              className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-4 py-2.5 text-sm font-bold transition hover:border-cyan-300/50"
            >
              {theme === "dark" ? t.nav.themeLight : t.nav.themeDark}
            </button>

            <a
              href="/login"
              className="rounded-2xl border border-cyan-300/30 bg-blue-500/20 px-5 py-2.5 text-sm font-bold text-[var(--ib-pill-text)] shadow-lg shadow-blue-500/10 backdrop-blur-xl transition hover:border-cyan-200/60 hover:bg-blue-500/30 hover:text-white"
            >
              {t.nav.login}
            </a>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-6 inline-flex max-w-full items-center gap-3 rounded-full border border-blue-400/30 bg-[var(--ib-pill-bg)] px-4 py-2 text-sm font-semibold text-[var(--ib-pill-text)] shadow-lg shadow-blue-500/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-500/10 ring-1 ring-cyan-300/30">
                  <Image
                    src="/images/logo/insightboard-logo3.png"
                    alt="InsightBoard Icon"
                    width={36}
                    height={36}
                    className="h-7 w-7 object-contain"
                  />
                </span>

                <span className="line-clamp-2">{t.hero.badge}</span>
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              {t.hero.title}
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--ib-muted)] md:text-lg">
              {t.hero.description}
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ib-accent-text)] md:text-base">
              {t.hero.sub}
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="/login"
                className="rounded-2xl bg-blue-500 px-7 py-4 text-center text-sm font-bold text-white shadow-2xl shadow-blue-500/25 transition hover:-translate-y-0.5 hover:bg-blue-400"
              >
                {t.hero.enter}
              </a>

              <button
                type="button"
                onClick={() => scrollToSection("contact")}
                className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-7 py-4 text-center text-sm font-bold backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-cyan-300/40"
              >
                {t.hero.contact}
              </button>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {t.stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-card)] p-4 backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-[var(--ib-card-strong)]"
                >
                  <p className="text-xs text-[var(--ib-muted)]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold md:text-base">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card relative overflow-hidden rounded-[34px] p-[2px] shadow-[0_0_52px_rgba(37,99,235,0.16)]">
            <div className="relative z-10 rounded-[32px] p-6 md:p-8">
              <div className="glow-pulse absolute right-10 top-10 h-40 w-40 rounded-full bg-[var(--ib-glow-soft)] blur-[70px]" />

              <div className="relative inline-flex rounded-full border border-cyan-300/25 bg-[var(--ib-pill-bg)] px-4 py-2 text-xs font-bold text-[var(--ib-pill-text)]">
                {t.crm.live}
              </div>

              <div className="mt-8 rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-card-strong)] p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-[var(--ib-muted)]">
                      {t.crm.health}
                    </p>
                    <p className="mt-1 text-3xl font-black">92%</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-400">
                    {t.crm.strong}
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--ib-track)]">
                  <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-blue-500 via-cyan-300 to-indigo-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]" />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-card)] p-5">
                  <p className="text-xs text-[var(--ib-muted)]">
                    {t.crm.revenue}
                  </p>
                  <p className="mt-2 text-2xl font-black">BHD 8.4K</p>
                  <p className="mt-2 text-xs text-emerald-400">
                    {t.crm.growth}
                  </p>
                </div>

                <div className="rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-card)] p-5">
                  <p className="text-xs text-[var(--ib-muted)]">
                    {t.crm.projects}
                  </p>
                  <p className="mt-2 text-2xl font-black">12</p>
                  <p className="mt-2 text-xs text-[var(--ib-accent-text)]">
                    {t.crm.active}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-card)] p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p className="text-sm font-bold">{t.crm.pipeline}</p>
                  <p className="text-xs text-[var(--ib-muted)]">
                    {t.crm.monthly}
                  </p>
                </div>

                <div className="space-y-4">
                  {t.crm.pipelineItems.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex justify-between text-xs text-[var(--ib-muted)]">
                        <span>{item.label}</span>
                        <span>{item.percent}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--ib-track)]">
                        <div
                          style={{ width: item.percent }}
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_14px_rgba(56,189,248,0.35)]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-blue-300/20 bg-blue-500/10 p-5 backdrop-blur-xl">
                <p className="text-sm font-bold text-[var(--ib-accent-text)]">
                  {t.crm.clarityTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ib-muted)]">
                  {t.crm.clarityText}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--ib-accent-text)]">
              {t.features.label}
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              {t.features.heading}
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--ib-muted)]">
              {t.features.text}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((feature, index) => (
              <div
                key={feature.title}
                className="group rounded-[30px] border border-[var(--ib-border)] bg-[var(--ib-card)] p-6 backdrop-blur-xl transition hover:-translate-y-1 hover:border-blue-300/40 hover:bg-[var(--ib-card-strong)] hover:shadow-[0_0_45px_rgba(37,99,235,0.16)]"
              >
                <div className="mb-7 flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-sm font-black text-[var(--ib-accent-text)] ring-1 ring-blue-300/20">
                    0{index + 1}
                  </div>

                  <span className="rounded-full border border-cyan-300/20 bg-[var(--ib-pill-bg)] px-3 py-1 text-[11px] font-bold text-[var(--ib-pill-text)]">
                    {feature.outcome}
                  </span>
                </div>

                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--ib-muted)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preview" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--ib-accent-text)]">
                {t.preview.label}
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                {t.preview.heading}
              </h2>
              <p className="mt-5 text-base leading-8 text-[var(--ib-muted)]">
                {t.preview.text}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/25 bg-[var(--ib-pill-bg)] px-4 py-3 text-sm font-bold text-[var(--ib-pill-text)]">
              {t.preview.badge}
            </div>
          </div>

<div
    dir="ltr"
    className="overflow-hidden rounded-[36px] border border-[var(--ib-border)] bg-[var(--ib-card)] p-5 shadow-[0_0_70px_rgba(37,99,235,0.1)] backdrop-blur-xl"
    >
  <div className="preview-marquee flex gap-5">
            {marqueeItems.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                  dir={language === "ar" ? "rtl" : "ltr"}
                className="group relative h-[300px] w-[460px] shrink-0 overflow-hidden rounded-[34px] border border-[var(--ib-border)] bg-[var(--ib-preview-card)] p-4 shadow-[0_0_42px_rgba(37,99,235,0.14)] transition hover:-translate-y-1 hover:border-cyan-300/40 sm:h-[360px] sm:w-[600px] lg:h-[410px] lg:w-[720px]"
              >
                <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-cyan-400/14 blur-[70px]" />
                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-blue-500/14 blur-[75px]" />

                <div className="relative mb-4 flex items-center justify-between gap-4">
                  <p className="text-sm font-black md:text-base">{item.title}</p>

                  <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[10px] font-bold text-[var(--ib-pill-text)] md:text-xs">
                    {t.preview.previewLabel}
                  </span>
                </div>

                <div className="relative h-[235px] overflow-hidden rounded-[26px] border border-[var(--ib-border)] bg-[var(--ib-soft)] sm:h-[290px] lg:h-[330px]">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={`${item.title} screenshot`}
                      fill
                      sizes="(max-width: 640px) 460px, (max-width: 1024px) 600px, 720px"
                      className="object-cover object-top transition duration-700 group-hover:scale-[1.025]"
                    />
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section id="stack" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div className="rounded-[32px] border border-[var(--ib-border)] bg-[var(--ib-card)] p-7 backdrop-blur-xl md:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--ib-accent-text)]">
              {t.stack.label}
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight">
              {t.stack.heading}
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--ib-muted)]">
              {t.stack.text}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-4 py-2 text-sm font-semibold transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--ib-border)] bg-[var(--ib-card)] p-7 backdrop-blur-xl md:p-9">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--ib-accent-text)]">
              {t.product.label}
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight">
              {t.product.heading}
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--ib-muted)]">
              {t.product.text}
            </p>

            <div className="mt-8 space-y-3">
              {t.product.points.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-solid-card)] px-4 py-3"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.6)]" />
                  <p className="text-sm font-semibold">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="builder" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--ib-accent-text)]">
              {t.builder.label}
            </p>
            <h2 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              {t.builder.heading}
            </h2>
          </div>

          <div className="rounded-[32px] border border-[var(--ib-border)] bg-[var(--ib-card)] p-7 backdrop-blur-xl md:p-9">
            <p className="text-lg leading-9 text-[var(--ib-muted)]">
              {t.builder.text}
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {t.builder.cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-3xl border border-[var(--ib-border)] bg-[var(--ib-solid-card)] p-5"
                >
                  <p className="text-sm font-bold">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ib-muted)]">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToSection("contact")}
                className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
              >
                {t.hero.contact}
              </button>

              <a
                href={`mailto:${EMAIL}`}
                className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-5 py-3 text-sm font-bold transition hover:border-cyan-300/40"
              >
                {t.contact.email}
              </a>

              <a
                href="/login"
                className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-5 py-3 text-sm font-bold transition hover:border-cyan-300/40"
              >
                {t.hero.enter}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="relative px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-blue-300/20 bg-gradient-to-br from-blue-500/15 via-white/[0.06] to-cyan-400/10 p-8 shadow-[0_0_70px_rgba(37,99,235,0.14)] backdrop-blur-xl md:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--ib-accent-text)]">
                {t.contact.label}
              </p>
              <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                {t.contact.heading}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--ib-muted)]">
                {t.contact.text}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a
                href="/login"
                className="rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-blue-500 to-indigo-500 px-7 py-4 text-center text-sm font-black text-white shadow-2xl shadow-blue-500/25 transition hover:-translate-y-0.5 hover:from-blue-400 hover:to-cyan-400"
              >
                {t.contact.enter}
              </a>

              <a
                href={`mailto:${EMAIL}`}
                className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-7 py-4 text-center text-sm font-black transition hover:bg-blue-500/10"
              >
                {t.contact.email}
              </a>

              <a
                href={PORTFOLIO_CONTACT}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-[var(--ib-border)] bg-[var(--ib-soft)] px-7 py-4 text-center text-sm font-black transition hover:bg-blue-500/10"
              >
                {t.contact.portfolio}
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-[var(--ib-border)] px-6 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-[var(--ib-muted)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-[var(--ib-text)]">
              {t.footer.rights}
            </p>
            <p className="mt-1 text-xs text-[var(--ib-muted)]">
              {t.footer.made}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href={PORTFOLIO_CONTACT}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.footer.portfolio}
            </a>

            <a href="/login" className="transition hover:text-[var(--ib-text)]">
              {t.footer.admin}
            </a>

            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="transition hover:text-[var(--ib-text)]"
            >
              {t.footer.contact}
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}
