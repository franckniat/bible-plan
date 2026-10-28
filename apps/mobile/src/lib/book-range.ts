import {
  bookPassage,
  books,
  getBook,
  type BookId,
  type Passage,
} from "@workspace/core"

/**
 * Every book from the first to the last, in the order of the Bible: what a
 * plan by chapters reads (as the web's wizard).
 */
export function bookRange(from: BookId, to: BookId): Passage[] {
  const [first, last] = [getBook(from).order, getBook(to).order].sort(
    (a, b) => a - b
  )
  return books
    .filter((book) => book.order >= first! && book.order <= last!)
    .map((book) => bookPassage(book.id))
}
