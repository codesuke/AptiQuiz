import type { PrismaClient } from "./index.js";

/** Approved Colleges a User may pick as Home College. Add new institutions here and re-run the seed. */
export const APPROVED_COLLEGES: readonly string[] = [
  "Indian Institute of Technology Bombay",
  "Indian Institute of Technology Delhi",
  "Indian Institute of Technology Madras",
  "Indian Institute of Technology Kanpur",
  "Indian Institute of Technology Kharagpur",
  "Indian Institute of Technology Roorkee",
  "Indian Institute of Technology Guwahati",
  "Indian Institute of Technology Hyderabad",
  "Indian Institute of Technology (BHU) Varanasi",
  "Indian Institute of Technology Indore",
  "Indian Institute of Information Technology Allahabad",
  "Indian Institute of Information Technology Hyderabad",
  "Indian Institute of Information Technology Delhi",
  "Indian Institute of Science Bengaluru",
  "National Institute of Technology Tiruchirappalli",
  "National Institute of Technology Karnataka Surathkal",
  "National Institute of Technology Warangal",
  "National Institute of Technology Rourkela",
  "National Institute of Technology Calicut",
  "National Institute of Technology Kurukshetra",
  "National Institute of Technology Durgapur",
  "Motilal Nehru National Institute of Technology Allahabad",
  "Malaviya National Institute of Technology Jaipur",
  "Visvesvaraya National Institute of Technology Nagpur",
  "Birla Institute of Technology and Science Pilani",
  "Birla Institute of Technology Mesra",
  "Delhi Technological University",
  "Netaji Subhas University of Technology",
  "Jadavpur University",
  "Anna University",
  "College of Engineering Pune",
  "Veermata Jijabai Technological Institute",
  "Vellore Institute of Technology",
  "SRM Institute of Science and Technology",
  "Manipal Institute of Technology",
  "Thapar Institute of Engineering and Technology",
  "PSG College of Technology",
  "RV College of Engineering",
  "BMS College of Engineering",
  "PES University",
  "Amrita Vishwa Vidyapeetham",
  "Kalinga Institute of Industrial Technology",
  "Siksha 'O' Anusandhan University",
  "Lovely Professional University",
  "Chandigarh University",
  "Amity University Noida",
  "Symbiosis Institute of Technology",
  "Dwarkadas J. Sanghvi College of Engineering",
  "Sardar Patel Institute of Technology",
  "Thadomal Shahani Engineering College",
  "Maharaja Agrasen Institute of Technology",
  "Guru Gobind Singh Indraprastha University",
  "Jaypee Institute of Information Technology",
  "Vishwakarma Institute of Technology",
  "Pune Institute of Computer Technology",
  "Shri Ramdeobaba College of Engineering and Management",
  "Birla Institute of Technology and Science Hyderabad",
  "Osmania University College of Engineering",
  "Jawaharlal Nehru Technological University Hyderabad",
  "Andhra University College of Engineering",
  "Savitribai Phule Pune University",
  "University of Delhi",
  "Institute of Engineering and Management Kolkata",
  "Heritage Institute of Technology",
  "Vellore Institute of Technology Chennai",
  "Sri Sivasubramaniya Nadar College of Engineering",
  "Coimbatore Institute of Technology",
  "Government College of Engineering Pune",
  "Rajiv Gandhi Proudyogiki Vishwavidyalaya",
  "Visvesvaraya Technological University",
];

/** Folds case, accents, punctuation, and spacing so spelling variants of one College collide. */
export function normalizeCollegeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Deterministic ID so a College keeps one identity across seed runs and environments. */
export function collegeIdFor(name: string): string {
  return `college_${normalizeCollegeName(name).replace(/ /g, "-")}`;
}

/**
 * Idempotent: one statement upserts on the unique normalized name and never changes an existing
 * College's ID. A single round trip keeps the seed fast against a remote database.
 */
export async function seedColleges(db: PrismaClient): Promise<void> {
  const ids = APPROVED_COLLEGES.map(collegeIdFor);
  const names = [...APPROVED_COLLEGES];
  const normalizedNames = APPROVED_COLLEGES.map(normalizeCollegeName);

  await db.$executeRaw`
    INSERT INTO "College" ("id", "name", "normalizedName")
    SELECT * FROM unnest(${ids}::text[], ${names}::text[], ${normalizedNames}::text[])
    ON CONFLICT ("normalizedName") DO UPDATE SET "name" = EXCLUDED."name"`;
}
