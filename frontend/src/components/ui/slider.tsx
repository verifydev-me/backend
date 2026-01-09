import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    {/* Track */}
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
      {/* Active Range */}
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500" />
    </SliderPrimitive.Track>

    {/* Circular Thumb */}
    <SliderPrimitive.Thumb
      style={{
        borderRadius: '50%',
        outline: 'none',
        boxShadow: '0 0 10px rgba(251, 146, 60, 0.5)',
      }}
      className="block h-5 w-5 rounded-full bg-white border-2 border-orange-400 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
