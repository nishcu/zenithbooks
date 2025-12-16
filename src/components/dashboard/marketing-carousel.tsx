
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
      className="w-full hidden md:block"
      plugins={[plugin.current]}
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{loop: true}}
    >
      <CarouselContent>
        {carouselImages.map((item) => (
          <CarouselItem key={item.id}>
            <Card className="overflow-hidden">
              <CardContent className="relative flex h-32 sm:h-40 md:h-48 lg:h-56 items-center justify-center p-0">
                <Image
                  src={item.imageUrl}
                  alt={item.description}
                  fill
                  className="object-cover"
                  data-ai-hint={item.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/70" />
                <div className="relative z-10 text-center text-white p-4 sm:p-6 md:p-8">
                  <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold drop-shadow-lg">{item.description}</h2>
                  <p className="mt-2 sm:mt-3 text-xs sm:text-sm md:text-base lg:text-lg text-white/90 drop-shadow-md">Powered by ZenithBooks</p>
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
