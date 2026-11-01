export type Language = "en" | "ar";
export type Theme = "light" | "dark";

export const links = {
  portfolio: "https://fadelprofile.vercel.app/",
  contact: "https://fadelprofile.vercel.app/#contact",
  github: "https://github.com/Fadelm300",
  email: "fadel.m200@gmail.com",
};

export const screenshots = [
  {
    light: "Dashboard_img_1.png",
    dark: "Dashboard_img_1_dark.png"
  },
  {
    light: "Clients_img.png"
  },
  {
    light: "Deals_img.png"
  },
  {
    light: "Projects_img.png"
  },
  {
    light: "Revenue_img.png"
  },
  {
    light: "Expenses_img.png"
  },
  {
    light: "Reports_img_1.png",
    dark: "Reports_img_1_dark.png"
  },
  {
    light: "Settings_img.png",
    dark: "Settings_img_dark.png"
  },
] as const;

export function screenshot(index: number, theme: Theme) {
  const shot: { light: string; dark?: string } = screenshots[index];

  return "/images/Screenshot/" + (
    theme === "dark" && shot.dark ? shot.dark : shot.light
  );
}

export const featurePreviews = [1, 2, 3, 4, 6, 7];

const imageDimensions = [
  [1918, 955, 1915, 951],
  [1918, 957],
  [1918, 954],
  [1918, 955],
  [1918, 952],
  [1918, 955],
  [1915, 952, 1918, 957],
  [1918, 955, 1918, 948],
];

export function dimensions(index: number, theme: Theme) {
  const values = imageDimensions[index];

  return theme === "dark" && values.length === 4
    ? { width: values[2], height: values[3] }
    : { width: values[0], height: values[1] };
}

export const technologies = [
  ["Next.js", "React", "TypeScript"],
  ["Node.js", "API routes"],
  ["MongoDB", "Mongoose"],
  ["MUI", "Tailwind CSS", "Recharts"],
  ["Git", "Postman"],
];

export const content = {
  en: {
    nav: ["Features", "Product", "Technology", "Developer"],

    login: "Admin login",
    menu: "Menu",
    close: "Close",
    language: "العربية",

    light: "Switch to light theme",
    dark: "Switch to dark theme",

    label: "PRIVATE CRM / BUILT IN BAHRAIN",

    hero: "A clearer view of your",
    business: "business.",

    description:
      "Clients, deals, projects and finances. Connected in one practical workspace.",

    demo: "Explore the demo",
    meet: "Meet the developer",

    modules: ["Clients", "Deals", "Projects", "Finance", "Reports"],

    workflowLabel: "02 / THE WORKFLOW",
    workflow: "From the first conversation to the final payment.",

    workflowIntro:
      "A focused workspace for the everyday flow of your business. Built in Bahrain by Fadel Mohammad Fadel.",

    stages: ["Clients", "Deals", "Projects", "Finance"],

    features: [
      [
        "Client management",
        "Keep client details, contact information and related projects together."
      ],
      [
        "Deal pipeline",
        "Track opportunities from the first inquiry to a closed deal."
      ],
      [
        "Project delivery",
        "Turn won deals into projects and follow their delivery, costs and deadlines."
      ],
      [
        "Revenue and expenses",
        "Review income, expenses and profit with the context behind each record."
      ],
      [
        "Reports",
        "Review business performance through reports and financial summaries."
      ],
      [
        "Admin access",
        "A private, single-admin workspace with protected dashboard routes."
      ],
    ],

    previewLabel: "03 / INSIDE INSIGHTBOARD",
    preview: "See how the pieces fit.",

    previewIntro:
      "A clear, focused workspace for clients, deals, projects and finances — built for real work.",

    tabs: [
      "Overview",
      "Clients",
      "Deals",
      "Projects",
      "Revenue",
      "Expenses",
      "Reports",
      "Settings"
    ],

    previews: [
      [
        "Business overview",
        "Your key metrics, recent deals and financial summary in one view."
      ],
      [
        "Every relationship, with its context.",
        "Keep client details and related business records in one place."
      ],
      [
        "A pipeline you can follow.",
        "Review deal stages, values and the next opportunity."
      ],
      [
        "From agreement to delivery.",
        "Follow project status, deadlines, costs and profitability."
      ],
      [
        "Keep income in view.",
        "Review recorded revenue and payment information."
      ],
      [
        "Know where the money goes.",
        "Organize expenses and understand business costs."
      ],
      [
        "A clearer picture of performance.",
        "Explore reports across sales, projects and finances."
      ],
      [
        "Your workspace, your preferences.",
        "Manage the settings available to the administrator."
      ],
    ],

    sample: "Sample records shown. Explore the view-only demo.",

    enlarge: "Enlarge image",
    previous: "Previous preview",
    next: "Next preview",

    techLabel: "04 / HOW IT IS BUILT",
    tech: "Thoughtful engineering. Practical software.",

    techIntro:
      "Built from database models to the interface, with a focus on clear workflows and maintainable code.",

    categories: ["INTERFACE", "SERVER", "DATA", "UI", "TOOLS"],

    approach: "Built around real work",

    principles: [
      [
        "Connected records",
        "Clients, deals and projects remain linked."
      ],
      [
        "Controlled access",
        "Private sign-in with single-admin access."
      ],
      [
        "View-only demo",
        "Demo mode prevents changes to records."
      ],
    ],

    developerLabel: "05 / THE DEVELOPER",
    developer: "Designed and built by Fadel.",

    name: "Fadel Mohammad Fadel",
    role: "Software Engineer / Bahrain",

    bio:
      "A Computer Science graduate building practical web systems, from database design and API logic to responsive interfaces.",

    areas: [
      "Interface design",
      "Full-stack development",
      "Business workflows"
    ],

    contactLabel: "GET IN TOUCH",
    contact: "Take a closer look.",

    contactIntro:
      "Explore the view-only demo, or get in touch about the project.",

    portfolio: "View portfolio",
    contactLink: "Get in touch",
    built: "Built in Bahrain",

    copyright: "© 2026 Fadel Mohammad Fadel.",
    skip: "Skip to content",
  },

  ar: {
    nav: ["الخصائص", "استعراض النظام", "التقنيات", "المطور"],

    login: "دخول المدير",
    menu: "القائمة",
    close: "إغلاق",
    language: "English",

    light: "التبديل إلى الوضع الفاتح",
    dark: "التبديل إلى الوضع الداكن",

    label: "نظام CRM خاص / تطوير بحريني",

    hero: "رؤية أوضح لأعمالك.",
    business: "",

    description:
      "العملاء والصفقات والمشاريع والمالية، ضمن مساحة عمل واحدة واضحة وعملية.",

    demo: "استعرض النسخة التجريبية",
    meet: "تعرّف على المطور",

    modules: ["العملاء", "الصفقات", "المشاريع", "المالية", "التقارير"],

    workflowLabel: "02 / سير العمل",
    workflow: "من أول تواصل إلى آخر دفعة.",

    workflowIntro:
      "مساحة عمل مركزة لتنظيم أعمالك اليومية. طوّرها فاضل محمد فاضل في البحرين.",

    stages: ["العملاء", "الصفقات", "المشاريع", "المالية"],

    features: [
      [
        "إدارة العملاء",
        "احتفظ ببيانات العملاء ومعلومات التواصل والمشاريع المرتبطة بهم في مكان واحد."
      ],
      [
        "مسار الصفقات",
        "تابع الفرص من أول استفسار حتى إغلاق الصفقة."
      ],
      [
        "تنفيذ المشاريع",
        "حوّل الصفقات الناجحة إلى مشاريع وتابع التنفيذ والتكاليف والمواعيد."
      ],
      [
        "الإيرادات والمصروفات",
        "راجع الدخل والمصروفات والأرباح مع تفاصيل كل سجل."
      ],
      [
        "التقارير",
        "راجع أداء الأعمال من خلال التقارير والملخصات المالية."
      ],
      [
        "وصول المدير",
        "مساحة عمل خاصة لمدير واحد، مع حماية مسارات لوحة التحكم."
      ],
    ],

    previewLabel: "03 / داخل INSIGHTBOARD",
    preview: "شاهد كيف تتكامل أقسام النظام.",

    previewIntro:
      "مساحة عمل واضحة ومركزة للعملاء والصفقات والمشاريع والمالية، مصممة للعمل الفعلي.",

    tabs: [
      "نظرة عامة",
      "العملاء",
      "الصفقات",
      "المشاريع",
      "الإيرادات",
      "المصروفات",
      "التقارير",
      "الإعدادات"
    ],

    previews: [
      [
        "نظرة عامة على الأعمال",
        "المؤشرات الأساسية وأحدث الصفقات والملخص المالي في شاشة واحدة."
      ],
      [
        "كل علاقة، بتفاصيلها.",
        "احتفظ ببيانات العملاء وسجلات الأعمال المرتبطة بهم في مكان واحد."
      ],
      [
        "مسار واضح لصفقاتك.",
        "راجع مراحل الصفقات وقيمتها والفرص القادمة."
      ],
      [
        "من الاتفاق إلى التسليم.",
        "تابع حالة المشاريع ومواعيدها وتكاليفها وأرباحها."
      ],
      [
        "إيراداتك أمامك.",
        "راجع الإيرادات المسجلة ومعلومات الدفعات."
      ],
      [
        "اعرف أين تُصرف الأموال.",
        "نظّم المصروفات وافهم تكاليف أعمالك."
      ],
      [
        "صورة أوضح للأداء.",
        "استعرض تقارير المبيعات والمشاريع والمالية."
      ],
      [
        "إعدادات مساحة عملك.",
        "أدر الإعدادات المتاحة لمدير النظام."
      ],
    ],

    sample:
      "السجلات المعروضة تجريبية. استعرض النسخة المخصصة للقراءة فقط.",

    enlarge: "تكبير الصورة",
    previous: "المعاينة السابقة",
    next: "المعاينة التالية",

    techLabel: "04 / طريقة البناء",
    tech: "هندسة مدروسة. برمجيات عملية.",

    techIntro:
      "من نماذج البيانات إلى الواجهة، مع التركيز على وضوح سير العمل وسهولة صيانة الكود.",

    categories: ["الواجهة", "الخادم", "البيانات", "واجهة المستخدم", "الأدوات"],

    approach: "مصمم للعمل الفعلي",

    principles: [
      [
        "سجلات مترابطة",
        "يبقى العملاء والصفقات والمشاريع مرتبطين ببعضهم."
      ],
      [
        "وصول مضبوط",
        "تسجيل دخول خاص مع وصول لمدير واحد."
      ],
      [
        "نسخة للقراءة فقط",
        "يمنع الوضع التجريبي تعديل السجلات."
      ],
    ],

    developerLabel: "05 / المطور",
    developer: "تصميم وتطوير فاضل.",

    name: "فاضل محمد فاضل",
    role: "مهندس برمجيات / البحرين",

    bio:
      "خريج علوم حاسوب يطوّر أنظمة ويب عملية، من تصميم قواعد البيانات ومنطق الـ API إلى الواجهات المتجاوبة.",

    areas: [
      "تصميم الواجهات",
      "تطوير متكامل",
      "سير عمل الأعمال"
    ],

    contactLabel: "لنتواصل",
    contact: "تعرّف على المشروع أكثر.",

    contactIntro:
      "استعرض النسخة التجريبية، أو تواصل معي بخصوص المشروع.",

    portfolio: "استعرض البورتفوليو",
    contactLink: "تواصل معي",
    built: "طُوّر في البحرين",

    copyright: "© 2026 فاضل محمد فاضل.",
    skip: "انتقل إلى المحتوى",
  },
};