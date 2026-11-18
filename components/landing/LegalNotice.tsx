import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { links } from "./content";
import styles from "./legalNotice.module.css";

const copy = {
  privacy: {
    en: {
      title: "Privacy notice",
      sections: [
        ["Data used by InsightBoard", "The application uses account details and access permissions to sign users in and enforce access. Authorised users may enter customer contact details and business records such as deals, projects, revenue and expenses. The system records actions such as archive decisions for accountability."],
        ["Cookies", "The session cookie identifies a signed-in session. Language and theme preference cookies remember display choices. Signing out invalidates the session and clears its cookie. Display preference cookies can be cleared through the browser."],
        ["Questions about personal data", "Use the contact link below for questions or requests about your personal data. Provide enough information to identify the request and keep passwords and session identifiers private."],
      ],
    },
    ar: {
      title: "إشعار الخصوصية",
      sections: [
        ["البيانات في InsightBoard", "يستخدم التطبيق بيانات الحساب والصلاحيات لتسجيل الدخول وضبط الوصول. يستطيع المستخدم المخوّل تسجيل بيانات تواصل العملاء وسجلات العمل مثل الصفقات والمشاريع والإيرادات والمصروفات. يسجّل النظام إجراءات مثل قرارات الأرشفة لأغراض التدقيق."],
        ["ملفات تعريف الارتباط", "تعرّف كوكي الجلسة جلسة المستخدم المسجّل. تحفظ كوكيز التفضيلات اختيار اللغة والثيم. يلغي تسجيل الخروج الجلسة ويمسح الكوكي الخاصة بها. تقدر تمسح كوكيز التفضيلات من المتصفح."],
        ["الاستفسار عن البيانات", "استخدم رابط التواصل أدناه للاستفسار أو تقديم طلب يتعلق ببياناتك الشخصية. اذكر المعلومات اللازمة لتحديد الطلب وحافظ على سرية كلمات المرور ومعرّفات الجلسة."],
      ],
    },
  },
  terms: {
    en: {
      title: "Terms of use",
      sections: [
        ["Access", "Use an account assigned to you and keep its credentials private. Work within the access granted to you and use customer information only for authorised business purposes."],
        ["Demo", "The demo is intended for evaluation. Use fictitious information when discussing or demonstrating workflows. Perform real business work only in the authorised company environment."],
        ["Questions and support", "Use the project contact link for support or questions about these terms."],
      ],
    },
    ar: {
      title: "شروط الاستخدام",
      sections: [
        ["الوصول", "استخدم الحساب المخصّص لك وحافظ على سرية بيانات الدخول. التزم بالصلاحيات الممنوحة لك واستخدم معلومات العملاء لأغراض العمل المخوّلة."],
        ["الديمو", "الديمو مخصص للتجربة. استخدم معلومات افتراضية عند شرح إجراءات العمل أو عرضها. نفّذ أعمال الشركة الفعلية في بيئتها المصرّح بها."],
        ["الاستفسارات والدعم", "استخدم رابط التواصل الخاص بالمشروع للدعم أو للاستفسار عن هالشروط."],
      ],
    },
  },
};

export default async function LegalNotice({ kind }: { kind: keyof typeof copy }) {
  if (process.env.LEGAL_NOTICE_MODE !== "review") notFound();

  const preferences = await cookies();
  const arabic = preferences.get("language")?.value === "ar";
  const { title, sections } = copy[kind][arabic ? "ar" : "en"];

  return (
    <main className={styles.notice} lang={arabic ? "ar" : "en"} dir={arabic ? "rtl" : "ltr"}>
      <Link href="/">{arabic ? "الصفحة الرئيسية" : "Home"}</Link>
      <h1>{title}</h1>
      <p>{arabic ? "مسودة للمراجعة" : "Draft for review"}</p>
      {sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
      <a href={links.contact}>{arabic ? "التواصل مع المشروع" : "Contact the project"}</a>
    </main>
  );
}
