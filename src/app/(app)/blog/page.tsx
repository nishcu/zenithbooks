
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, User, Calendar, Search, Clock, TrendingUp, Filter, RefreshCw, CloudUpload } from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { migrateBlogPostsImages } from '@/lib/storage';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Sample posts removed - blog will start fresh

// Calculate reading time (average 200 words per minute)
const calculateReadingTime = (content: string[]): number => {
    const words = content.join(' ').split(/\s+/).length;
    return Math.ceil(words / 200);
};

// Storage key for blog posts
const BLOG_POSTS_STORAGE_KEY = "zenithbooks_blog_posts";

// Function to get blog posts from localStorage
function getStoredBlogPosts() {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(BLOG_POSTS_STORAGE_KEY);
        const posts = stored ? JSON.parse(stored) : [];
        console.log('Blog page: Loaded posts from storage:', posts.length, 'posts');

        // Log the first few posts to see their images
        posts.slice(0, 3).forEach((post, index) => {
            console.log(`Post ${index + 1} (${post.id}): imageUrl =`, post.imageUrl ? post.imageUrl.substring(0, 50) + '...' : 'missing');
        });

        return posts;
    } catch (error) {
        console.error('Error loading blog posts from localStorage:', error);
        return [];
    }
}

// Function to save blog posts to localStorage (for debugging)
function saveBlogPostsDebug(posts: any[]) {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(BLOG_POSTS_STORAGE_KEY, JSON.stringify(posts));
        console.log('Blog page: Saved posts to localStorage:', posts.length, 'posts');
    } catch (error) {
        console.error('Error saving blog posts to localStorage:', error);
    }
}

// Function to migrate base64 images to Firebase Storage
async function migrateBlogImages() {
    if (typeof window === 'undefined') return;

    try {
        console.log('Starting image migration to Firebase Storage...');
        const posts = getStoredBlogPosts();
        const migratedPosts = await migrateBlogPostsImages(posts);

        // Save migrated posts back to localStorage
        localStorage.setItem(BLOG_POSTS_STORAGE_KEY, JSON.stringify(migratedPosts));
        console.log('Image migration completed successfully');

        // Update state
        window.location.reload(); // Simple way to refresh and show migrated images
    } catch (error) {
        console.error('Error during image migration:', error);
        alert('Failed to migrate images. Check console for details.');
    }
}

export default function BlogPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [blogPosts, setBlogPosts] = useState<any[]>([]); // Start empty - will load from Firebase
    const [isLoading, setIsLoading] = useState(true);

    // Clear localStorage and load blog posts from Firebase (fresh start)
    useEffect(() => {
        // Clear any cached blog posts from localStorage
        if (typeof window !== 'undefined') {
            localStorage.removeItem(BLOG_POSTS_STORAGE_KEY);
            console.log('Cleared localStorage blog posts cache');
        }

        const loadBlogPosts = async () => {
            try {
                console.log('Loading blog posts from Firebase...');
                const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
                const querySnapshot = await getDocs(q);

                const posts: any[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    posts.push({
                        id: doc.id,
                        ...data,
                        date: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
                    });
                });

                console.log('Loaded blog posts from Firebase:', posts.length, 'posts');

                // Set posts (empty array if no posts found)
                setBlogPosts(posts);
            } catch (error) {
                console.error('Error loading blog posts:', error);
                // Keep sample posts on error
            } finally {
                setIsLoading(false);
            }
        };

        loadBlogPosts();
    }, []); // Only run once

    // Get unique categories (simple version)
    const categories = Array.isArray(blogPosts) ?
        Array.from(new Set(blogPosts.map(post => post?.category).filter(Boolean))) :
        [];

    // Show loading state
    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Loading blog posts...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Sort and filter posts (simple version)
    const getFilteredPosts = () => {
        if (!Array.isArray(blogPosts)) return [];

        let posts = [...blogPosts].sort((a, b) =>
            new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime()
        );

        if (selectedCategory) {
            posts = posts.filter(post => post?.category === selectedCategory);
        }

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            posts = posts.filter(post =>
                post?.title?.toLowerCase().includes(searchLower) ||
                post?.description?.toLowerCase().includes(searchLower) ||
                post?.author?.toLowerCase().includes(searchLower) ||
                post?.category?.toLowerCase().includes(searchLower)
            );
        }

        return posts;
    };

    const filteredPosts = getFilteredPosts();
    const featuredPost = filteredPosts[0] || null;

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
                <div className="flex gap-2">
                    <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search articles..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            const updatedPosts = getStoredBlogPosts();
                            setBlogPosts(updatedPosts);
                            console.log('Manually refreshed blog posts');
                        }}
                        title="Refresh posts"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={migrateBlogImages}
                        title="Migrate images to Firebase Storage"
                        className="ml-2"
                    >
                        <CloudUpload className="h-4 w-4 mr-1" />
                        Migrate Images
                    </Button>
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
                            className="flex flex-col overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        >
                            <Link href={`/blog/${post.id}`} className="flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg">
                                <div className="relative aspect-video overflow-hidden rounded-t-lg">
                                    <Image
                                        src={post.imageUrl || 'https://picsum.photos/800/400?random=default'}
                                        alt={post.title}
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-300"
                                        data-ai-hint={post.imageHint}
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        onError={(e) => {
                                            console.error('Failed to load blog image:', post.imageUrl, 'for post:', post.id);
                                            // Fallback to a default image
                                            const target = e.target as HTMLImageElement;
                                            target.src = 'https://picsum.photos/800/400?random=fallback';
                                        }}
                                    />
                                </div>
                                <CardHeader className="flex-grow">
                                    <Badge variant="secondary" className="w-fit mb-2">{post.category}</Badge>
                                    <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
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

