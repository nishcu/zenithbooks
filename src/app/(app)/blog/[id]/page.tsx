
"use client";

import { useParams } from 'next/navigation';
import { samplePosts } from '../page';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SocialShareButtons } from '@/components/social-share-buttons';
import * as React from 'react';

export default function BlogPostPage() {
    const params = useParams();
    const { id } = params;
    const contentRef = React.useRef<HTMLDivElement>(null);

    const post = samplePosts.find(p => p.id === id);

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
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <Link href="/blog" passHref>
                <span className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="size-4" /> Back to all posts
                </span>
            </Link>

            <article ref={contentRef} className="prose dark:prose-invert max-w-none bg-card p-4 sm:p-8 rounded-lg">
                 <div className="space-y-4 not-prose">
                     <Badge variant="secondary">{post.category}</Badge>
                     <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
                     <div className="flex items-center gap-6 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <User className="size-4"/>
                            <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="size-4"/>
                            <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric'})}</span>
                        </div>
                    </div>
                </div>

                <div className="relative aspect-video my-8 rounded-lg overflow-hidden">
                    <Image 
                        src={post.imageUrl} 
                        alt={post.title} 
                        layout="fill" 
                        objectFit="cover"
                        data-ai-hint={post.imageHint}
                    />
                </div>

                {post.content.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}
            </article>
            <div className="not-prose flex items-center justify-between mt-4">
                <span className='font-semibold'>Share this post:</span>
                <SocialShareButtons url={post.shareUrl} title={post.title} />
             </div>
        </div>
    )
}
