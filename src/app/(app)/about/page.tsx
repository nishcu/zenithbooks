
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building, Gem, Goal, Users, BrainCircuit, Rocket, ShieldCheck, Eye } from "lucide-react";
import Image from 'next/image';

export default function AboutPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="relative h-64 w-full rounded-lg overflow-hidden group">
                <Image 
                    src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxidXNpbmVzcyUyMG1lZXRpbmd8ZW58MHx8fHwxNzU4Nzk0NjYwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Our Team in a Meeting"
                    layout="fill"
                    objectFit="cover"
                    className="group-hover:scale-105 transition-transform duration-500"
                    data-ai-hint="business meeting"
                />
                <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                    <div className="text-center text-primary-foreground p-4">
                        <h1 className="text-4xl md:text-6xl font-bold">About ZenithBooks</h1>
                        <p className="mt-2 text-lg md:text-xl">Your Business at its Peak.</p>
                    </div>
                </div>
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-3xl">
                        <Rocket className="size-8 text-primary" />
                        Our Mission
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Our mission is to simplify financial compliance and management for businesses and professionals across India. We believe that by leveraging technology and automation, we can empower our users to focus on what they do best: growing their business. ZenithBooks is designed to be an intuitive, all-in-one platform that makes complex tasks like GST filing, accounting, and legal documentation effortless and accurate.
                    </p>
                </CardContent>
            </Card>
            
            <Card className="shadow-lg bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-3xl">
                        <Eye className="size-8 text-primary" />
                        Our Vision
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        Inspired by the national call to build world-class Indian firms capable of standing alongside global giants, our vision is to create a unified financial ecosystem for India. We believe the future isn't about replacing the 'Big Four', but about empowering a million smaller firms to operate with the same level of efficiency and excellence. ZenithBooks is our contribution to this dream—a platform that equips local professionals across the nation with cutting-edge tools, unifying compliance and elevating Indian enterprise to the world stage. We are not just building software; we are building a testament to Indian innovation and self-reliance.
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Gem /> Our Values</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-3 rounded-full"><Users className="size-6 text-primary"/></div>
                            <div>
                                <h3 className="font-semibold text-lg">Customer-Centricity</h3>
                                <p className="text-sm text-muted-foreground">Our users are at the heart of everything we do. We are committed to building solutions that solve real-world problems and drive success.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-3 rounded-full"><BrainCircuit className="size-6 text-primary"/></div>
                            <div>
                                <h3 className="font-semibold text-lg">Simplicity in Design</h3>
                                <p className="text-sm text-muted-foreground">We strive to make complex processes simple and intuitive, ensuring a seamless and accessible user experience for everyone.</p>
                            </div>
                        </div>
                         <div className="flex items-start gap-4">
                            <div className="bg-primary/10 p-3 rounded-full"><ShieldCheck className="size-6 text-primary"/></div>
                            <div>
                                <h3 className="font-semibold text-lg">Integrity and Accuracy</h3>
                                <p className="text-sm text-muted-foreground">We are committed to the highest standards of data accuracy and integrity to build unwavering trust and ensure compliance.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Users /> The Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                            ZenithBooks is built by a passionate team of chartered accountants, software engineers, and tax experts dedicated to revolutionizing the financial tech landscape in India. Our combined expertise ensures that our platform is not only technologically advanced but also grounded in a deep understanding of India's complex financial regulations. We are innovators and problem-solvers, united by a common goal to empower businesses.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
