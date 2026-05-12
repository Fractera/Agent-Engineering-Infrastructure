"use client"

import { useEffect, useState, useCallback } from "react"
import { Trash2, Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { FileUploadField } from "@/services/upload/file-upload-field.client"
import type { UploadedFile } from "@/services/upload/upload.service"

const ENV_HINT = process.env.NODE_ENV === "development"
  ? " — Check REMOTE_DATA_URL and DATA_API_KEY in .env.local"
  : ""


type Product = {
  id: string
  name: string
  price: number
  media_id: string | null
  media_url: string | null
  created_at: string
}

export default function DashboardPage() {
  const [ready, setReady]             = useState(false)
  const [products, setProducts]       = useState<Product[]>([])
  const [adding, setAdding]           = useState(false)
  const [form, setForm]               = useState({ name: "", price: "" })
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/products")
    if (res.ok) {
      const data = await res.json()
      setProducts(data.products)
    }
  }, [])

  useEffect(() => {
    fetch("/api/me")
      .then(res => {
        if (!res.ok) { window.location.href = "/" }
        else { setReady(true); loadProducts() }
      })
      .catch(() => { window.location.href = "/" })
  }, [loadProducts])

  function resetForm() {
    setForm({ name: "", price: "" })
    setUploadedFile(null)
    setAdding(false)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      form.name.trim(),
          price:     parseFloat(form.price),
          media_id:  uploadedFile?.id  ?? null,
          media_url: uploadedFile?.url ?? null,
        }),
      })
      if (!res.ok) throw new Error("Failed to create product")
      toast.success("Product created")
      resetForm()
      await loadProducts()
    } catch (e) {
      toast.error(String(e) + ENV_HINT)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success("Product deleted")
    } catch (e) {
      toast.error(String(e) + ENV_HINT)
    } finally {
      setDeleting(null)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors">
              ← back
            </a>
            <h1 className="text-xl font-semibold mt-1 text-foreground">Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Product catalogue · DB + media upload test
            </p>
          </div>
          <button
            onClick={() => setAdding(v => !v)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs text-foreground hover:bg-muted transition-colors"
          >
            {adding ? <X size={12} /> : <Plus size={12} />}
            {adding ? "Cancel" : "Add product"}
          </button>
        </div>

        {/* Add product form */}
        {adding && (
          <div className="mb-6 p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-xs font-medium text-foreground mb-3">New product</p>
            <div className="flex flex-wrap gap-3 mb-3">
              <input
                type="text"
                placeholder="Product name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                className="flex-1 min-w-[160px] h-8 px-3 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                type="number"
                placeholder="Price"
                min={0}
                step={0.01}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-28 h-8 px-3 rounded-md border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <FileUploadField
                accept="image"
                preview
                label="Upload photo"
                onUpload={f => setUploadedFile(f)}
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim() || !form.price}
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}

        {/* Products table */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">No products yet</p>
            <p className="text-xs text-muted-foreground mt-1 opacity-60">
              Click «Add product» to create the first one
            </p>
          </div>
        ) : (
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
                        onClick={() => handleDelete(p.id)}
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
        )}

        <p className="mt-6 text-[10px] text-muted-foreground font-mono opacity-50 text-center">
          {products.length} product{products.length !== 1 ? "s" : ""} · data stored in SQLite · images via media service
        </p>
      </div>
    </main>
  )
}
