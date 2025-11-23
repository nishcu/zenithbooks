
"use client";

import { useParams } from 'next/navigation';
// Import removed - no longer using sample posts
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Calendar, ArrowLeft, Clock, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SocialShareButtons } from '@/components/social-share-buttons';
import * as React from 'react';
import { useEffect, useState } from 'react';
import Head from 'next/head';

// Calculate reading time
const calculateReadingTime = (content: string[]): number => {
    const words = content.join(' ').split(/\s+/).length;
    return Math.ceil(words / 200);
};

// Get related posts (currently disabled - no posts available)
const getRelatedPosts = (currentPost: any, allPosts: any[], limit: number = 3) => {
    return []; // Return empty array since we removed all posts
};

// Storage key for blog posts
const BLOG_POSTS_STORAGE_KEY = "zenithbooks_blog_posts";

// Function to get blog posts from localStorage
function getStoredBlogPosts() {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(BLOG_POSTS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading blog posts from localStorage:', error);
        return [];
    }
}

export default function BlogPostPage() {
    const params = useParams();
    const { id } = params;
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [readingProgress, setReadingProgress] = useState(0);

    // Get posts from localStorage or fallback to samplePosts
    const blogPosts = getStoredBlogPosts();
    const post = blogPosts.find(p => p.id === id);

    // Set dynamic meta tags for social sharing
    useEffect(() => {
        if (post && typeof window !== 'undefined') {
            const baseUrl = window.location.origin;
            const postUrl = `${baseUrl}/blog/${post.id}`;

            // Update document title
            document.title = `${post.title} | ZenithBooks`;

            // Create or update meta tags
            const updateMetaTag = (property: string, content: string) => {
                let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.setAttribute('property', property);
                    document.head.appendChild(meta);
                }
                meta.setAttribute('content', content);
            };

            // Open Graph tags
            updateMetaTag('og:title', post.title);
            updateMetaTag('og:description', post.description);
            updateMetaTag('og:url', postUrl);
            updateMetaTag('og:image', post.imageUrl);
            updateMetaTag('og:image:width', '1200');
            updateMetaTag('og:image:height', '630');
            updateMetaTag('og:type', 'article');
            updateMetaTag('og:site_name', 'ZenithBooks');

            // Twitter Card tags
            updateMetaTag('twitter:card', 'summary_large_image');
            updateMetaTag('twitter:title', post.title);
            updateMetaTag('twitter:description', post.description);
            updateMetaTag('twitter:image', post.imageUrl);

            // Article specific tags
            updateMetaTag('article:author', post.author);
            updateMetaTag('article:published_time', post.date);
            updateMetaTag('article:section', post.category);
        }
    }, [post, id]);

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
    
    const relatedPosts = getRelatedPosts(post, []); // No related posts available

    return (
        <>
            <Head>
                <title>{post ? `${post.title} | ZenithBooks` : 'Blog Post | ZenithBooks'}</title>
                <meta name="description" content={post ? (post.description.length > 160 ? post.description.substring(0, 157) + '...' : post.description) : 'Read our latest blog posts on accounting, GST, and financial management.'} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="article" />
                <meta property="og:site_name" content="ZenithBooks" />
                <meta property="og:title" content={post?.title || 'Blog Post'} />
                <meta property="og:description" content={post ? (post.description.length > 160 ? post.description.substring(0, 157) + '...' : post.description) : 'Read our latest blog posts on accounting, GST, and financial management.'} />
                <meta property="og:url" content={typeof window !== 'undefined' ? `${window.location.origin}/blog/${id}` : `/blog/${id}`} />
                {post && <meta property="og:image" content={post.imageUrl} />}
                {post && <meta property="og:image:width" content="1200" />}
                {post && <meta property="og:image:height" content="630" />}
                {post && <meta property="og:image:alt" content={post.title} />}

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={post?.title || 'Blog Post'} />
                <meta name="twitter:description" content={post ? (post.description.length > 160 ? post.description.substring(0, 157) + '...' : post.description) : 'Read our latest blog posts on accounting, GST, and financial management.'} />
                {post && <meta name="twitter:image" content={post.imageUrl} />}

                {/* Article specific */}
                {post && <meta property="article:author" content={post.author} />}
                {post && <meta property="article:published_time" content={new Date(post.date).toISOString()} />}
                {post && <meta property="article:section" content={post.category} />}
                {post && <meta property="article:tag" content={post.category} />}
            </Head>

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
                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 768px, 1200px"
                                onError={(e) => {
                                    console.error('Failed to load blog post image:', post.imageUrl);
                                    // Fallback to a default image
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=600&fit=crop&crop=center';
                                }}
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
        </>
    )
}
