# Architecture

The API is split into three packages.

`users` owns the user record and the store that reads it. The store exposes
`GetUserByID`, which every request path goes through.

`admin` builds reports. It depends on `users` and calls the store directly.

`billing` keeps its own counters. It has a method that happens to be called
`GetUserByID` too, but it returns a billing key rather than a record, so the two
are unrelated despite the name.
