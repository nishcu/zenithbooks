
"use client";

import { useParams } from 'next/navigation';
import { samplePosts } from '../page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SocialShareButtons } from '@/components/social-share-buttons';
import * as React from 'react';
import { useEffect, useState } from 'react';

// Calculate reading time
const calculateReadingTime = (content: string[]): number => {
    const words = content.join(' ').split(/\s+/).length;
    return Math.ceil(words / 200);
};

// Get related posts
const getRelatedPosts = (currentPost: typeof samplePosts[0], allPosts: typeof samplePosts, limit: number = 3) => {
    return allPosts
        .filter(post => 
            post.id !== currentPost.id && 
            (post.category === currentPost.category || 
             post.title.toLowerCase().split(' ').some(word => 
                currentPost.title.toLowerCase().includes(word) && word.length > 4
             ))
        )
        .slice(0, limit);
};

export default function BlogPostPage() {
    const params = useParams();
    const { id } = params;
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [readingProgress, setReadingProgress] = useState(0);

    const post = samplePosts.find(p => p.id === id);

    // Reading progress indicator
    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
            setReadingProgress(Math.min(100, Math.max(0, progress)));
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!post) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold">Post not found</h2>
                <p className="text-muted-foreground">The blog post you're looking for does not exist.</p>
                 <Link href="/blog" passHref>
                    <span className="mt-8 inline-block text-primary hover:underline flex items-center gap-2">
                        <ArrowLeft className="size-4" /> Back to Blog
                    </span>
                </Link>
            </div>
        );
    }
    
    const relatedPosts = getRelatedPosts(post, samplePosts);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Reading Progress Bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
                <div 
                    className="h-full bg-primary transition-all duration-150"
                    style={{ width: `${readingProgress}%` }}
                />
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-8">
                    <Link href="/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
                        <ArrowLeft className="h-4 w-4" /> Back to all posts
                    </Link>

                    <article ref={contentRef} className="prose dark:prose-invert max-w-none bg-card p-6 sm:p-8 lg:p-12 rounded-lg shadow-sm">
                        <div className="space-y-4 not-prose mb-8">
                            <Badge variant="secondary" className="text-sm">{post.category}</Badge>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">{post.title}</h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4"/>
                                    <span>{post.author}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4"/>
                                    <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4"/>
                                    <span>{calculateReadingTime(post.content)} min read</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative aspect-video my-8 rounded-lg overflow-hidden shadow-lg">
                            <Image 
                                src={post.imageUrl} 
                                alt={post.title} 
                                fill
                                className="object-cover"
                                data-ai-hint={post.imageHint}
                                priority
                            />
                        </div>

                        <div className="space-y-4">
                            {post.content.map((paragraph, index) => (
                                <p key={index} className="text-base leading-7">{paragraph}</p>
                            ))}
                        </div>
                    </article>

                    {/* Share Section */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">Enjoyed this article?</h3>
                                    <p className="text-sm text-muted-foreground">Share it with your network</p>
                                </div>
                                <SocialShareButtons url={post.shareUrl} title={post.title} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Related Articles
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {relatedPosts.map(relatedPost => (
                                    <Link 
                                        key={relatedPost.id} 
                                        href={`/blog/${relatedPost.id}`}
                                        className="block group"
                                    >
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                                {relatedPost.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {relatedPost.description}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(relatedPost.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short'})}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
