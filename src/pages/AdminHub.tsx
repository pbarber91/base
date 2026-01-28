// src/pages/AdminHub.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import GradientCard from "@/components/ui/GradientCard";
import { Users, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminHub() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold">Admin Hub</h1>
              <p className="text-slate-200 mt-1">Platform administration and management tools.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ✅ NEW entry point */}
          <GradientCard variant="warm" className="p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">User Admin</h2>
                <p className="text-slate-600 mb-6">
                  View and edit users, roles, and church assignments.
                </p>
                <Link to="/admin/users">
                  <Button className="bg-amber-600 hover:bg-amber-700 gap-2">
                    Open User Admin
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </GradientCard>

          {/* Keep other existing admin cards below as you add them */}
        </div>
      </div>
    </div>
  );
}
