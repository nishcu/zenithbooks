
export type TdsSection = {
    section: string;
    description: string;
    rate: number;
    isTCS?: boolean;
};

export const tdsSections: TdsSection[] = [
    { section: "192", description: "Salary", rate: 0, isTCS: false }, // Slab rates apply
    { section: "194A", description: "Interest other than on securities", rate: 10, isTCS: false },
    { section: "194C", description: "Payment to Contractors (Individual/HUF)", rate: 1, isTCS: false },
    { section: "194C", description: "Payment to Contractors (Others)", rate: 2, isTCS: false },
    { section: "194H", description: "Commission or Brokerage", rate: 5, isTCS: false },
    { section: "194I", description: "Rent - Plant & Machinery", rate: 2, isTCS: false },
    { section: "194I", description: "Rent - Land, Building, Furniture", rate: 10, isTCS: false },
    { section: "194J", description: "Fees for Professional or Technical Services", rate: 10, isTCS: false },
    { section: "194Q", description: "Purchase of goods", rate: 0.1, isTCS: false },
    { section: "206C(1)", description: "Sale of Scrap", rate: 1, isTCS: true },
    { section: "206C(1G)", description: "LRS Remittance / Overseas Tour Package", rate: 5, isTCS: true },
    { section: "206C(1H)", description: "Sale of Goods (over ₹50 Lakh)", rate: 0.1, isTCS: true },
];
