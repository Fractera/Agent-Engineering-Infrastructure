"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { UploadedFile } from "@/services/upload/upload.service"
import { registerRedirectUrl } from "@/lib/runtime-urls"
import { projectApi } from "@/lib/architecture/project-api"
import type { Product } from "./types"
import { ProductForm } from "./product-form.client"
import { ProductTable } from "./product-table.client"

const ENV_HINT = process.env.NODE_ENV === "development"
  ? " — Check REMOTE_DATA_URL and DATA_API_KEY in .env.local"
  : ""

export function DashboardApp() {
  const [ready, setReady]               = useState(false)
  const [products, setProducts]         = useState<Product[]>([])
  const [adding, setAdding]             = useState(false)
  const [form, setForm]                 = useState({ name: "", price: "" })
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    const res = await fetch(projectApi("/products"))
    if (res.ok) {
      const data = await res.json()
      setProducts(data.products)
    }
  }, [])

  useEffect(() => {
    // Unauthorized (only reachable in Secure mode — insecure bypasses /api/me):
    // send the visitor to the auth register form and return them here after
    // sign-up/in. requireRole="user" so any authenticated user reaches the
    // dashboard (the auth form otherwise admin-gates every callbackUrl).
    const toAuth = () => {
      window.location.href = registerRedirectUrl(window.location.href, "user")
    }
    fetch("/api/me")
      .then(res => {
        if (!res.ok) { toAuth() }
        else { setReady(true); loadProducts() }
      })
      .catch(toAuth)
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
      const res = await fetch(projectApi("/products"), {
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
      const res = await fetch(projectApi(`/products/${id}`), { method: "DELETE" })
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

        {adding && (
          <ProductForm
            form={form}
            setForm={setForm}
            saving={saving}
            onSave={handleAdd}
            onUpload={setUploadedFile}
          />
        )}

        <ProductTable products={products} deleting={deleting} onDelete={handleDelete} />

        <p className="mt-6 text-[10px] text-muted-foreground font-mono opacity-50 text-center">
          {products.length} product{products.length !== 1 ? "s" : ""} · data stored in SQLite · images via media service
        </p>
      </div>
    </main>
  )
}
