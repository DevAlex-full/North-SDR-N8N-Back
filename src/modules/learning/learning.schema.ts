import { z } from 'zod'

// Todos os endpoints de /learning são GET somente-leitura.
// Filtro opcional de janela temporal reutilizável entre os endpoints.
export const learningQuerySchema = z.object({
  since: z.coerce.date().optional(),
})

export type LearningQuery = z.infer<typeof learningQuerySchema>