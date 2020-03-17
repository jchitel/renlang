/// An iterator that captures all iterated items internally so that it can be backtracked.
/// In order for this to work, the iterator items must be cloneable.
/// 
/// This is used to implement our token stream in our packrat parser.
pub struct BacktrackIterator<I: Iterator> {
    /// Items that have not yet been iterated
    iter: I,
    /// Items captured from the iterator that can be backtracked
    backtrack: Vec<I::Item>,
    /// If 0, the actual iterator will yield items.
    /// If n > 0, we are in "backtracking mode" and captured items will be iterated.
    /// Each captured item emitted will decrement the offset until it is 0.
    offset: usize,
}

impl<I: Iterator> Iterator for BacktrackIterator<I> where I::Item : Clone {
    type Item = I::Item;

    fn next(&mut self) -> Option<Self::Item> {
        if self.offset == 0 {
            // normal mode, get items from the iterator and push them onto the backtrack list
            if let Some(item) = self.iter.next() {
                self.backtrack.push(item.clone());
                Some(item)
            } else {
                None
            }
        } else {
            // backtrack mode, get items from the backtrac list and decrement the offset
            let index = self.backtrack.len() - self.offset;
            let item = self.backtrack[index];
            self.offset -= 1;
            Some(item)
        }
    }
}

impl<I: Iterator> BacktrackIterator<I> where I::Item : Clone {
    pub fn backtrack(&mut self, count: usize) {
        if count < 0 { panic!("Backtrack count must be greater than or equal to 0"); }
        let offset = self.offset + count;
        if offset > self.backtrack.len() { panic!("Backtracked too far"); }
        self.offset = offset;
    }
}

pub trait IteratorExt<I: Iterator> {
    /// Creates a "backtrack" iterator from this iterator
    fn backtrack(self) -> BacktrackIterator<I>;
}

impl<I: Iterator> IteratorExt<I> for I {
    fn backtrack(self) -> BacktrackIterator<I> {
        BacktrackIterator { iter: self, backtrack: Vec::new(), offset: 0 }
    }
}
