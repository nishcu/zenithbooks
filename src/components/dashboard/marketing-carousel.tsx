
"use client"
import React, { memo, useMemo } from 'react';
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

export const MarketingCarousel = memo(function MarketingCarousel() {
  const carouselImages = useMemo(() => 
    PlaceHolderImages.filter((img) => img.id.startsWith("carousel")),
    []
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
              <CardContent className="relative flex h-32 sm:h-48 md:h-64 lg:aspect-[2.4/1] lg:h-auto items-center justify-center p-0">
                <Image
                  src={item.imageUrl}
                  alt={item.description}
                  fill
                  className="object-cover"
                  data-ai-hint={item.imageHint}
                />
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 text-center text-white p-2 sm:p-4">
                  <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">{item.description}</h2>
                  <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base lg:text-lg">Discover the power of GSTEase</p>
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
});
