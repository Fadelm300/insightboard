import { Types } from "mongoose";

const accounts = [
  ["ليلى آل خليفة", "layla", "manager"],
  ["يوسف المرزوق", "yusuf", "employee"],
  ["مريم الدوسري", "mariam", "senior"],
  ["Daniel Reyes", "daniel", "viewer"],
  ["نورة الهادي", "noura", "employee"],
  ["Sofia Bennett", "sofia", "senior"],
  ["حسن الشامسي", "hassan", "employee"],
  ["Amira Haddad", "amira", "viewer"],
  ["Jonas Weber", "jonas", "employee"],
  ["Priya Nair", "priya", "viewer"],
  ["Rania Mansour", "rania", "senior"],
];

const clients = [
  ["Fanous Roastery", "Hospitality", "Yusuf Al Marzooq", "Manama", "A small roaster selling beans and running tasting sessions.", "Wholesale order form", "Seasonal coffee shop", "Tasting event page", "Roastery site update", "Store hours maintenance"],
  ["Riwaq Learning Studio", "Education", "Mariam Al Doseri", "Muharraq", "An after-school studio with bilingual workshops.", "Workshop catalogue", "Parent registration site", "Summer programme page", "Tutor portfolio", "Accessibility review"],
  ["North Quay Interiors", "Interior design", "Daniel Reyes", "Dubai", "A design studio managing a small commercial fit-out portfolio.", "Supplier enquiry page", "Studio portfolio", "Materials catalogue", "Case study redesign", "Image library maintenance"],
  ["Jisr Physiotherapy", "Healthcare", "Noura Al Hadi", "Riffa", "A therapy practice publishing services and clinic information.", "Appointment enquiry page", "Practice website", "Clinician profiles", "Patient information redesign", "Clinic hours maintenance"],
  ["Marlin Coast Outfitters", "Retail", "Sofia Bennett", "Muscat", "An outdoor retailer supplying local hiking groups.", "Equipment preorder page", "Gear storefront", "Size guide refresh", "Trip guide portfolio", "Product feed maintenance"],
  ["Manara Facilities", "Facilities services", "Hassan Al Shamsi", "Hidd", "A facilities provider serving small offices and warehouses.", "Service request form", "Maintenance services site", "Vendor information page", "Service catalogue redesign", "Certificate updates"],
  ["Cedarlane Kitchen", "Food services", "Amira Haddad", "Amman", "A catering kitchen for small business functions.", "Catering quote page", "Weekly menu website", "Seasonal ordering store", "Menu redesign", "Menu publishing support"],
  ["Hafen Studio Works", "Media", "Jonas Weber", "Hamburg", "A small production studio licensing commercial footage.", "Licensing enquiry page", "Production portfolio", "Digital footage storefront", "Showreel refresh", "Archive maintenance"],
  ["Tidepath Logistics", "Logistics", "Priya Nair", "Dammam", "A regional carrier handling business-to-business deliveries.", "Freight quote intake", "Carrier services site", "Warehouse information page", "Route information redesign", "Customer guide updates"],
  ["Sidra Paper Goods", "Retail", "Rania Mansour", "Doha", "A stationery workshop selling personalised paper goods.", "Custom order intake", "Stationery web store", "Wedding collection page", "Product photography portfolio", "Catalogue maintenance"],
];

const readGrants = [
  "dashboard.read", "clients.read", "deals.read", "projects.read", "projects.financial.read",
  "finance.read", "revenue.read", "expenses.read", "reports.read", "settings.read",
];
const variants = [
  ["Landing Page", "Not Started", "Unpaid", 620],
  ["Business Website", "In Progress", "Partially Paid", 1780],
  ["Portfolio Website", "Review", "Partially Paid", 1050],
  ["Redesign", "Completed", "Paid", 1420],
  ["Maintenance", "Cancelled", "Unpaid", 340],
];
const openStages = ["Lead", "Contacted", "Proposal Sent", "Negotiation", "Closed Lost"];

function dateOffset(anchor, days) {
  return new Date(anchor.getTime() + days * 86_400_000);
}

export function buildInvestorDemo(anchor = new Date()) {
  const data = { users: [], clients: [], deals: [], projects: [], revenues: [], expenses: [] };
  const managerId = new Types.ObjectId();
  for (const [name, key, role] of accounts) {
    data.users.push({
      _id: role === "manager" ? managerId : new Types.ObjectId(),
      name, email: `investor-${key}@insightboard.test`, role, isActive: true, authVersion: 0,
      managedBy: role === "manager" ? null : managerId,
      allowedPermissions: role === "manager" ? [...readGrants, "users.read"] : [...readGrants],
      createdAt: anchor, updatedAt: anchor,
    });
  }

  clients.forEach(([companyName, businessType, contactPerson, location, description, ...titles], index) => {
    const clientId = new Types.ObjectId();
    const createdAt = dateOffset(anchor, -65 - index * 8);
    const timestamp = { createdAt, updatedAt: createdAt, isDeleted: false };
    data.clients.push({
      _id: clientId, companyName, businessType, location, description,
      contactPerson: ["Samira Noor", "Omar Hadi", "Tessa Collins", "Huda Fawzi", "Clara Stone", "Adnan Rashid", "Nadia Sayegh", "Lena Vogt", "Arun Menon", "Salma Khalil"][index],
      email: `contact-${index + 1}@companies.example`,
      notes: `Account coordination: ${contactPerson}.`, status: "Converted", ...timestamp,
    });

    const linkedDeal = new Types.ObjectId();
    const linkedPrice = variants[1][3] + index * 85;
    data.deals.push({
      _id: linkedDeal, clientId, title: titles[1], estimatedBudget: linkedPrice + 200,
      finalPrice: linkedPrice, probability: 100, status: "Closed Won",
      expectedCloseDate: dateOffset(anchor, -12 - index),
      description: `Approved delivery for ${companyName}. Scope includes content setup and a review before launch.`, ...timestamp,
    });
    for (const slot of [0, 1]) {
      const eligible = slot === 0 && index < 5;
      const status = eligible ? "Closed Won" : openStages[(index + slot * 3) % openStages.length];
      const estimatedBudget = 480 + index * 110 + slot * 420;
      data.deals.push({
        _id: new Types.ObjectId(), clientId,
        title: slot === 0 ? `${titles[0]} · phase 2` : `${titles[3]} · next quarter`,
        estimatedBudget, finalPrice: eligible ? estimatedBudget : 0, status,
        probability: eligible ? 100 : { Lead: 10, Contacted: 25, "Proposal Sent": 55, Negotiation: 75, "Closed Lost": 0 }[status],
        expectedCloseDate: dateOffset(anchor, eligible ? -4 - index : 12 + index * 3),
        description: eligible
          ? `Accepted scope for ${companyName}. Ready to create a linked project after kickoff confirmation.`
          : `Follow-up with ${companyName} on content readiness, delivery milestones, and support scope.`,
        ...timestamp,
      });
    }

    variants.forEach(([type, status, paymentStatus, basePrice], slot) => {
      const projectId = new Types.ObjectId();
      const agreedExtras = slot === 3 && index % 3 === 0 ? 95 : 0;
      const priced = basePrice + index * 85 + agreedExtras;
      const price = slot === 0 && index >= 8 ? null : priced;
      const cost = slot === 0 ? 0 : Math.round(priced * (0.26 + slot * 0.04));
      const projectDate = dateOffset(anchor, -31 - index * 5 + slot * 2);
      const projectTimestamp = { ...timestamp, createdAt: projectDate, updatedAt: projectDate };
      data.projects.push({
        _id: projectId, clientId, dealId: slot === 1 ? linkedDeal : null,
        name: `${companyName} · ${titles[slot]}`,
        type: slot === 1 && [4, 9].includes(index) ? "E-commerce Website" : type,
        price, cost, profit: price === null ? null : price - cost, agreedExtras, status, paymentStatus,
        deadline: dateOffset(anchor, status === "Completed" ? -4 - index : 9 + index + slot * 3),
        description: `${titles[slot]} for ${companyName}. Coordinate content with ${contactPerson}, review on mobile, and record client approval.`,
        ...projectTimestamp,
      });
      if (cost > 0) data.expenses.push({
        projectId, title: slot === 4 ? "Initial discovery cost" : "Production and quality review",
        amount: cost, category: slot === 4 ? "Other" : "Freelance Help",
        date: dateOffset(projectDate, 3), ...projectTimestamp,
      });
      if (paymentStatus !== "Unpaid") data.revenues.push({
        projectId, clientId, amount: paymentStatus === "Paid"
          ? price + (index === 0 ? 25 : 0)
          : Math.round(price * (slot === 1 ? 0.4 : 0.65)),
        paymentMethod: slot === 2 ? "BenefitPay" : "Bank Transfer",
        paymentDate: dateOffset(projectDate, 6), description: paymentStatus === "Paid" ? "Settlement" : "Milestone payment",
        ...projectTimestamp,
      });
    });
  });
  return data;
}
