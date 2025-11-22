
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Calendar, Search, Clock, TrendingUp, Filter } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';

export const samplePosts = [
    {
        id: "4",
        title: "PM Modi's Vision: An Indian 'Big Four' on the World Stage",
        description: "Prime Minister Narendra Modi has issued a powerful call to action for India's professionals: to build home-grown accounting and audit firms that can stand alongside the global 'Big Four'. This vision is not just about competition; it's about self-reliance, elevating Indian standards, and showcasing our nation's intellectual capital to the world. It’s a challenge to create institutions that are not only Indian in origin but global in excellence and integrity.",
        author: "Strategic Team, ZenithBooks",
        date: "2024-09-29",
        category: "Vision",
        imageUrl: "https://images.unsplash.com/photo-1623979047394-a3c9b74d4b23?w=800&h=400&fit=crop&crop=center",
        imageHint: "indian leader",
        shareUrl: "/blog/4",
        content: [
            "Prime Minister Narendra Modi has issued a powerful call to action for India's professionals: to build home-grown accounting and audit firms that can stand alongside the global 'Big Four'. This vision is not just about competition; it's about self-reliance, elevating Indian standards, and showcasing our nation's intellectual capital to the world. It’s a challenge to create institutions that are not only Indian in origin but global in excellence and integrity.",
            "The 'Big Four'—Deloitte, Ernst & Young (EY), PricewaterhouseCoopers (PwC), and Klynveld Peat Marwick Goerdeler (KPMG)—dominate the global landscape of audit, assurance, taxation, and advisory services. While their expertise is undeniable, the Prime Minister's vision encourages a paradigm shift. It calls for Indian firms to rise, fostering local talent, understanding the unique intricacies of the Indian economy, and building a legacy of trust and quality that can be exported globally.",
            "This is more than an economic goal; it's a matter of national pride and strategic importance. Having our own giant firms ensures that the future of Indian enterprise is guided by professionals who are deeply rooted in our own business culture while adhering to the highest international standards. It's an invitation to innovate, to lead, and to build the next generation of professional services from India, for the world."
        ]
    },
    {
        id: "5",
        title: "Beyond the 'Big Four': How ZenithBooks is Powering India's 'Big Fifth'",
        description: "The dream of an Indian 'Big Four' won't be realized by a single entity, but by empowering a million smaller firms. ZenithBooks is the platform for this revolution. We're building the 'Big Fifth'—not as one company, but as a unified network of empowered professionals across India. By providing cutting-edge tools for accounting, GST, and legal drafting, we enable local CAs and tax experts to operate with the efficiency and scale of a global giant, creating a decentralized powerhouse that will redefine professional services in India.",
        author: "Team ZenithBooks",
        date: "2024-09-29",
        category: "Our Mission",
        imageUrl: "https://images.unsplash.com/photo-1521737852577-68489a10811c?w=800&h=400&fit=crop&crop=center",
        imageHint: "professional network",
        shareUrl: "/blog/5",
        content: [
            "The dream of an Indian 'Big Four' won't be realized by a single entity, but by empowering a million smaller firms to operate with the efficiency of a giant. ZenithBooks is the platform for this revolution. We believe the true 'Big Fifth' of India will not be one company, but a decentralized, tech-enabled network of countless professionals across every town and city.",
            "Our mission is to provide the digital backbone for this movement. By offering an integrated SaaS platform that handles everything from complex GST filings and automated accounting to legal document generation and CA certifications, we are democratizing the tools of a global firm. We're giving every CA, tax consultant, and corporate secretary the power to manage more clients, deliver higher quality services, and compete on a level playing field.",
            "ZenithBooks is more than software; it's an ecosystem designed to elevate the entire professional community. We are building a testament to Indian innovation, equipping our local experts with the world-class technology they need to drive India's economic growth. Together, we are not just building a product; we are building the 'Big Fifth'—a collective force that will power the next chapter of Indian enterprise."
        ]
    },
    {
        id: "1",
        title: "Decoding GSTR-1 and GSTR-3B: A Guide to Reconciliation",
        description: "Understanding the nuances between GSTR-1 and GSTR-3B is crucial for every business. Dive deep into the common causes of mismatches and how to resolve them effectively to ensure seamless GST compliance.",
        author: "Priya Mehta, CA",
        date: "2024-07-28",
        category: "GST",
        imageUrl: "https://images.unsplash.com/photo-1554224155-1696413565d3?w=800&h=400&fit=crop&crop=center",
        imageHint: "financial documents",
        shareUrl: "/blog/1",
        content: [
            "GSTR-1 and GSTR-3B are the two most important returns in the GST regime, but discrepancies between them are a common source of notices from the tax department. Understanding how they relate is key to maintaining a clean compliance record.",
            "GSTR-1 is a detailed return of all your outward supplies (sales). It's where you report invoice-wise details of your B2B sales and consolidated figures for B2C sales. This return forms the basis for the recipient's Input Tax Credit (ITC) in their GSTR-2A/2B. In contrast, GSTR-3B is a summary return where you declare your total sales, total tax liability, and the total ITC you are claiming for the month. It's the return through which you actually pay your GST liability.",
            "Common reasons for mismatches include: timing differences in reporting invoices, amendments made in subsequent months, clerical errors in data entry, or reporting supplies under the wrong tax head (IGST vs. CGST/SGST). Regularly reconciling GSTR-1 with GSTR-3B, and both with your books of accounts, is not just good practice—it's essential for avoiding interest, penalties, and scrutiny from the GST authorities. Using a tool like ZenithBooks can automate this reconciliation process, saving you time and preventing costly errors."
        ]
    },
    {
        id: "2",
        title: "The Ultimate Guide to Choosing the Right Business Structure in India",
        description: "Sole Proprietorship, Partnership, LLP, or a Private Limited Company? Making the right choice at the start can save you from future headaches. We break down the pros and cons of each structure.",
        author: "Rohan Sharma, CS",
        date: "2024-07-25",
        category: "Business Registration",
        imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop&crop=center",
        imageHint: "business strategy meeting",
        shareUrl: "/blog/2",
        content: [
            "Choosing the right legal structure for your business is one of the most critical decisions you'll make as an entrepreneur. It impacts everything from your liability and taxation to your ability to raise funds. Here's a quick rundown of the most common structures in India:",
            "**Sole Proprietorship:** The simplest form, where you and your business are one and the same. It's easy to start and has minimal compliance, but you have unlimited personal liability for business debts. It's ideal for small, individual-run businesses.",
            "**Partnership Firm:** Involves two or more people co-owning the business. It's relatively easy to set up with a Partnership Deed. However, like a proprietorship, partners have unlimited liability.",
            "**Limited Liability Partnership (LLP):** A hybrid structure that offers the flexibility of a partnership with the benefit of limited liability. This means your personal assets are protected from business debts. It's a popular choice for professional service firms.",
            "**Private Limited Company (Pvt. Ltd.):** This is a separate legal entity, meaning the company is distinct from its owners (shareholders). It offers limited liability, makes it easier to raise capital, and projects a more professional image. However, it comes with higher compliance requirements. It's the preferred structure for startups aiming for high growth and funding."
        ]
    },
    {
        id: "3",
        title: "5 Common Mistakes to Avoid When Filing Your Income Tax Return",
        description: "Tax season doesn't have to be stressful. Learn about the five most common errors taxpayers make and how you can avoid them to ensure a smooth, penalty-free filing experience this year.",
        author: "Anjali Singh, Tax Consultant",
        date: "2024-07-22",
        category: "Income Tax",
        imageUrl: "https://images.unsplash.com/photo-1589949692098-26d0d752de8f?w=800&h=400&fit=crop&crop=center",
        imageHint: "tax calculator",
        shareUrl: "/blog/3",
        content: [
            "Filing your Income Tax Return (ITR) accurately is crucial to avoid notices and penalties from the Income Tax Department. Here are five common mistakes to watch out for:",
            "**1. Choosing the Wrong ITR Form:** Using the incorrect ITR form is a frequent error. For example, a salaried individual with no other income source uses ITR-1, but if they have capital gains, they must use ITR-2. Always verify the correct form based on your income sources.",
            "**2. Not Disclosing All Income Sources:** It's mandatory to report all sources of income, including interest from savings accounts, fixed deposits, rental income, or capital gains from investments. The tax department has access to this information through various channels, and non-disclosure can lead to scrutiny.",
            "**3. Failure to Verify Your Return:** Simply filing your ITR isn't enough. You must also verify it within 30 days of filing. An unverified return is considered invalid. The easiest way to verify is through an Aadhaar OTP.",
            "**4. Ignoring Form 26AS and AIS:** Your Form 26AS and Annual Information Statement (AIS) contain details of all tax deducted at source (TDS) on your behalf and other high-value transactions. Always reconcile the income and TDS figures in your ITR with these forms to avoid mismatches.",
            "**5. Incorrect Personal Information:** Simple errors like a wrong bank account number, an outdated address, or an incorrect email ID can cause problems, especially when it comes to receiving your refund. Always double-check your personal details before submitting."
        ]
    }
];

// Calculate reading time (average 200 words per minute)
const calculateReadingTime = (content: string[]): number => {
    const words = content.join(' ').split(/\s+/).length;
    return Math.ceil(words / 200);
};

export default function BlogPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(samplePosts.map(post => post.category));
        return Array.from(cats);
    }, []);

    // Sort posts by date (latest first)
    const sortedPosts = useMemo(() => {
        return [...samplePosts].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, []);

    // Featured post (latest)
    const featuredPost = sortedPosts[0];

    // Filter posts
    const filteredPosts = useMemo(() => {
        let posts = sortedPosts;
        
        if (selectedCategory) {
            posts = posts.filter(post => post.category === selectedCategory);
        }
        
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            posts = posts.filter(post => 
                post.title.toLowerCase().includes(searchLower) ||
                post.description.toLowerCase().includes(searchLower) ||
                post.author.toLowerCase().includes(searchLower) ||
                post.category.toLowerCase().includes(searchLower)
            );
        }
        
        return posts;
    }, [searchTerm, selectedCategory, sortedPosts]);

    // Regular posts (excluding featured)
    const regularPosts = filteredPosts.filter(post => post.id !== featuredPost.id);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    ZenithBooks Blog
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Insights on finance, compliance, and business growth in India.
                </p>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search articles..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Button
                        variant={selectedCategory === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(null)}
                    >
                        All
                    </Button>
                    {categories.map(category => (
                        <Button
                            key={category}
                            variant={selectedCategory === category ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Featured Post */}
            {!searchTerm && selectedCategory === null && featuredPost && (
                <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all duration-300">
                    <div className="grid md:grid-cols-2 gap-0">
                        <div className="relative aspect-video md:aspect-auto">
                            <Image
                                src={featuredPost.imageUrl}
                                alt={featuredPost.title}
                                fill
                                className="object-cover"
                                data-ai-hint={featuredPost.imageHint}
                                priority
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-primary text-primary-foreground">
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    Featured
                                </Badge>
                            </div>
                        </div>
                        <div className="flex flex-col p-6 md:p-8">
                            <Badge variant="secondary" className="w-fit mb-3">{featuredPost.category}</Badge>
                            <CardTitle className="text-2xl md:text-3xl mb-3 line-clamp-2">{featuredPost.title}</CardTitle>
                            <CardDescription className="text-base mb-4 line-clamp-3">{featuredPost.description}</CardDescription>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    <span>{featuredPost.author}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(featuredPost.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{calculateReadingTime(featuredPost.content)} min read</span>
                                </div>
                            </div>
                            <Link href={`/blog/${featuredPost.id}`}>
                                <Button className="w-full md:w-auto">
                                    Read Article <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            {/* Results Count */}
            {filteredPosts.length > 0 && (
                <div className="text-sm text-muted-foreground">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} found
                </div>
            )}

            {/* Regular Posts Grid */}
            {filteredPosts.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(selectedCategory === null && !searchTerm ? regularPosts : filteredPosts).map(post => (
                        <Card 
                            key={post.id} 
                            className="flex flex-col overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                        >
                            <Link href={`/blog/${post.id}`} className="flex flex-col h-full">
                                <div className="relative aspect-video overflow-hidden">
                                    <Image
                                        src={post.imageUrl}
                                        alt={post.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        data-ai-hint={post.imageHint}
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                    />
                                </div>
                                <CardHeader className="flex-grow">
                                    <Badge variant="secondary" className="w-fit mb-2">{post.category}</Badge>
                                    <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </CardTitle>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            <span className="truncate">{post.author}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{calculateReadingTime(post.content)} min</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription className="line-clamp-3">{post.description}</CardDescription>
                                </CardContent>
                                <CardFooter>
                                    <span className="flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                                        Read More <ArrowRight className="h-4 w-4" />
                                    </span>
                                </CardFooter>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">No articles found matching your criteria.</p>
                    <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory(null);
                        }}
                    >
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    );
}

