import Lottie from 'lottie-react'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  animationData?: any
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  animationData,
}: EmptyStateProps) {
  // Default animation data (simple empty box animation)
  const defaultAnimation = {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op: 120,
    w: 400,
    h: 400,
    nm: "Empty",
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "Box",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 120 }] },
          p: { a: 0, k: [200, 200, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] }
        },
        ao: 0,
        shapes: [
          {
            ty: "rc",
            d: 1,
            s: { a: 0, k: [100, 100] },
            p: { a: 0, k: [0, 0] },
            r: { a: 0, k: 10 }
          },
          {
            ty: "st",
            c: { a: 0, k: [0.5, 0.5, 0.5, 1] },
            o: { a: 0, k: 100 },
            w: { a: 0, k: 3 }
          }
        ],
        ip: 0,
        op: 120,
        st: 0,
        bm: 0
      }
    ]
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-64 h-64 mb-6">
        <Lottie
          animationData={animationData || defaultAnimation}
          loop
          className="w-full h-full"
        />
      </div>
      <h3 className="text-2xl font-semibold mb-2 text-center">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
