use std::collections::VecDeque;

/// An iterator that allows peeking ahead at an arbitrary amount
/// of items without progressing the iterator forward.
/// 
/// This is similar to Iterator.peek(), but for more than one item.
pub struct LookaheadIterator<I: Iterator> {
    iter: I,
    lookahead: VecDeque<Option<I::Item>>,
}

impl<I: Iterator> Iterator for LookaheadIterator<I> {
    type Item = I::Item;

    fn next(&mut self) -> Option<Self::Item> {
        if let Some(item) = self.lookahead.pop_front() {
            item
        } else {
            self.iter.next()
        }
    }
}

impl<I: Iterator> LookaheadIterator<I> {
    /// Peeks at the next item in this iterator and returns it
    /// without pushing the iterator forward.
    pub fn peek(&mut self) -> Option<&I::Item> {
        if !self.lookahead.is_empty() {
            Some(&self.lookahead[0].unwrap())
        } else if let Some(item) = self.iter.next() {
            self.lookahead.push_back(Some(item));
            Some(&item)
        } else {
            None
        }
    }

    /// Peeks at the next `count` items in this iterator and returns them
    /// without pushing the iterator forward.
    /// 
    /// The returned vector will always contain exactly the number of requested items,
    /// and will be padded with `None` if there are not enough items left in the iterator.
    pub fn peeks(&mut self, count: usize) -> Vec<Option<&I::Item>> {
        // if the lookahead is smaller than the requested amount, we need to fill it until it is
        if self.lookahead.len() < count {
            // take as many items from the iterator as we can
            self.lookahead.extend(self.iter
                .take(self.lookahead.len() - count)
                .map(Some));
            // there may not have been enough, so we fill the rest with None
            for i in 0..(self.lookahead.len() - count) {
                self.lookahead.push_back(None);
            }
        }
        // now we can take `count` items from the iterator and guarantee we'll have the right amount
        self.lookahead.iter()
            .take(count)
            // this converts our `&Option<Item>`s to `Option<&Item>`s
            .map(|x| x.as_ref())
            .collect()
    }
}

pub struct IteratorRequest<'a, I: Iterator> {
    iter: &'a LookaheadIterator<I>,
}

pub trait IteratorExt<I: Iterator> {
    /// Creates a "lookahead" iterator from this iterator
    fn lookahead(self) -> LookaheadIterator<I>;
}

impl<I: Iterator> IteratorExt<I> for I {
    fn lookahead(self) -> LookaheadIterator<I> {
        LookaheadIterator { iter: self, lookahead: VecDeque::new() }
    }
}
