
"use client"
import React from 'react';
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent } from "@/components/ui/card"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Autoplay from "embla-carousel-autoplay"

export function MarketingCarousel() {
  const carouselImages = PlaceHolderImages.filter((img) =>
    img.id.startsWith("carousel")
  );
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  return (
    <Carousel 
      className="w-full"
      plugins={[plugin.current]}
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{loop: true}}
    >
      <CarouselContent>
        {carouselImages.map((item) => (
          <CarouselItem key={item.id}>
            <Card className="overflow-hidden">
              <CardContent className="relative flex aspect-[2.4/1] items-center justify-center p-0">
                <Image
                  src={item.imageUrl}
                  alt={item.description}
                  fill
                  className="object-cover"
                  data-ai-hint={item.imageHint}
                />
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 text-center text-white p-4">
                  <h2 className="text-3xl md:text-4xl font-bold">{item.description}</h2>
                  <p className="mt-2 text-lg">Discover the power of GSTEase</p>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="absolute left-4" />
      <CarouselNext className="absolute right-4" />
    </Carousel>
  )
}
