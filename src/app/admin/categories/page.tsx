"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  order: number;
  articleCount?: number;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_ICONS = [
  { id: 'card', name: 'Karte', icon: '💳' },
  { id: 'dumbbell', name: 'Hantel', icon: '🏋️' },
  { id: 'building', name: 'Gebäude', icon: '🏢' },
  { id: 'user', name: 'Benutzer', icon: '👤' },
  { id: 'more', name: 'Mehr', icon: '⋯' },
  { id: 'star', name: 'Stern', icon: '⭐' },
  { id: 'heart', name: 'Herz', icon: '❤️' },
  { id: 'calendar', name: 'Kalender', icon: '📅' },
  { id: 'clock', name: 'Uhr', icon: '⏰' },
  { id: 'mail', name: 'Mail', icon: '✉️' },
  { id: 'settings', name: 'Einstellungen', icon: '⚙️' },
  { id: 'help', name: 'Hilfe', icon: '❓' },
];

function getIconEmoji(iconId: string): string {
  return AVAILABLE_ICONS.find(i => i.id === iconId)?.icon || '📄';
}

const authHeader = `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', icon: 'card', description: '' });
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<Category | null>(null);
  const dragOverItem = useRef<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { 'Authorization': authHeader }
      });
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Bitte gib einen Namen ein');
      return;
    }

    setSaving(true);
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';

      const res = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save category');

      await loadCategories();
      closeModal();
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bist du sicher, dass du diese Kategorie löschen möchtest?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader }
      });

      if (!res.ok) throw new Error('Failed to delete category');

      setCategories(categories.filter(c => c.id !== id));
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        icon: category.icon,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', icon: 'card', description: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', icon: 'card', description: '' });
  };

  // Drag and Drop handlers
  const handleDragStart = (category: Category) => {
    setDraggedItem(category);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    dragOverItem.current = categoryId;
  };

  const handleDrop = async () => {
    if (!draggedItem || !dragOverItem.current || draggedItem.id === dragOverItem.current) {
      setDraggedItem(null);
      return;
    }

    const newCategories = [...categories];
    const draggedIndex = newCategories.findIndex(c => c.id === draggedItem.id);
    const dropIndex = newCategories.findIndex(c => c.id === dragOverItem.current);

    const [removed] = newCategories.splice(draggedIndex, 1);
    newCategories.splice(dropIndex, 0, removed);

    setCategories(newCategories);
    setDraggedItem(null);

    // Save new order
    try {
      await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({ orderedIds: newCategories.map(c => c.id) })
      });
    } catch (err) {
      console.error('Failed to save order:', err);
      loadCategories(); // Reload on error
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Kategorien werden geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg" role="alert">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Kategorien</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Verwalte die Kategorien für deine Artikel</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Neue Kategorie
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-apple-lg px-4 py-3 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            Ziehe die Kategorien per Drag & Drop um die Reihenfolge zu ändern.
          </p>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-apple-gray-500 text-lg mb-2">Keine Kategorien vorhanden</p>
            <p className="text-apple-gray-400 text-sm">Erstelle deine erste Kategorie!</p>
          </div>
        ) : (
          <div className="divide-y divide-apple-gray-100">
            {categories.map((category, index) => (
              <div
                key={category.id}
                draggable
                onDragStart={() => handleDragStart(category)}
                onDragOver={(e) => handleDragOver(e, category.id)}
                onDrop={handleDrop}
                onDragEnd={() => setDraggedItem(null)}
                className={`flex items-center gap-4 px-6 py-4 hover:bg-apple-gray-50 transition-colors cursor-grab active:cursor-grabbing ${
                  draggedItem?.id === category.id ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <div className="text-apple-gray-300 hover:text-apple-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 bg-apple-gray-100 rounded-apple flex items-center justify-center text-xl">
                  {getIconEmoji(category.icon)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-apple-gray-600">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-apple-gray-400 truncate">{category.description}</p>
                  )}
                </div>

                {/* Article Count */}
                <div className="text-sm text-apple-gray-400">
                  {category.articleCount || 0} Artikel
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(category)}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-400 hover:text-brand hover:bg-apple-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {categories.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-apple-gray-400">
          <span>{categories.length} {categories.length === 1 ? 'Kategorie' : 'Kategorien'} insgesamt</span>
          <span>{categories.reduce((sum, c) => sum + (c.articleCount || 0), 0)} Artikel zugeordnet</span>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-apple-xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="px-6 py-4 border-b border-apple-gray-100">
              <h2 className="text-xl font-semibold text-apple-gray-600">
                {editingCategory ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-apple-gray-600 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Mitgliedschaft"
                  className="w-full px-4 py-3 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-apple-gray-600 mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map((icon) => (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: icon.id })}
                      className={`w-10 h-10 rounded-apple-lg text-xl flex items-center justify-center transition-all ${
                        formData.icon === icon.id
                          ? 'bg-brand text-white ring-2 ring-brand ring-offset-2'
                          : 'bg-apple-gray-100 hover:bg-apple-gray-200'
                      }`}
                      title={icon.name}
                    >
                      {icon.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-apple-gray-600 mb-2">Beschreibung (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="z.B. Verträge, Kündigung & Beitrag"
                  className="w-full px-4 py-3 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-apple-gray-100 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-apple-gray-600 hover:bg-apple-gray-100 rounded-apple-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-brand text-white font-medium rounded-apple-lg hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
