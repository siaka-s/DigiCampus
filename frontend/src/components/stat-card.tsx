import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { ElementType } from "react"

type Trend = "up" | "down" | "neutral"

interface StatCardProps {
  label:     string
  value:     string | number
  icon:      ElementType
  iconColor?: string
  subtitle?: string
  trend?:    Trend
  trendLabel?: string
}

export function StatCard({
  label, value, icon: Icon, iconColor = "text-digicampus-primary",
  subtitle, trend, trendLabel,
}: StatCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up"
    ? "text-digicampus-success"
    : trend === "down"
    ? "text-digicampus-danger"
    : "text-digicampus-text-secondary"

  return (
    <Card className="bg-white border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-digicampus-text-secondary uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-digicampus-text-primary mt-1.5">{value}</p>
            {(trendLabel || subtitle) && (
              <div className="flex items-center gap-1 mt-1.5">
                {trend && (
                  <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                )}
                <p className={`text-xs ${trend ? trendColor : "text-digicampus-text-secondary"}`}>
                  {trendLabel ?? subtitle}
                </p>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl bg-digicampus-neutral flex items-center justify-center shrink-0 ml-3`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
