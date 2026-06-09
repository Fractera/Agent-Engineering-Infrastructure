"use client"

import { Trash2, Loader2 } from "lucide-react"
import type { Product } from "./types"

type Props = {
  products: Product[]
  deleting: string | null
  onDelete: (id: string) => void
}

export function ProductTable({ products, deleting, onDelete }: Props) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
        <p className="text-sm text-muted-foreground">No products yet</p>
        <p className="text-xs text-muted-foreground mt-1 opacity-60">
          Click «Add product» to create the first one
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-14">Photo</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Price</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground font-mono">ID</th>
            <th className="px-4 py-2.5 w-10" />
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr
              key={p.id}
              className={`border-b border-border last:border-0 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
            >
              <td className="px-4 py-2.5">
                {p.media_url ? (
                  <img
                    src={p.media_url}
                    alt={p.name}
                    className="h-8 w-8 rounded object-cover border border-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded border border-border bg-muted/40 flex items-center justify-center text-muted-foreground opacity-40">
                    —
                  </div>
                )}
              </td>
              <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
              <td className="px-4 py-2.5 text-foreground">${p.price.toFixed(2)}</td>
              <td className="px-4 py-2.5 font-mono text-muted-foreground">
                {p.id.slice(0, 8)}…
              </td>
              <td className="px-4 py-2.5 text-right">
                <button
                  onClick={() => onDelete(p.id)}
                  disabled={deleting === p.id}
                  className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                >
                  {deleting === p.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
