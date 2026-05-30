import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import pb from '@/lib/pb'
import type { Recipe } from '@/types'

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const imageUrl = recipe.image
    ? pb.files.getURL(recipe as never, recipe.image, { thumb: '400x300' })
    : null

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)
  const tags: string[] = Array.isArray(recipe.tags) ? recipe.tags : []

  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="group block rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl select-none">🍽️</span>
          </div>
        )}
        {recipe.household && (
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            Shared
          </span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <p className="font-medium leading-snug line-clamp-2">{recipe.title}</p>

        {recipe.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
                {tag}
              </Badge>
            ))}
          </div>
          {totalTime > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              {totalTime}m
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
