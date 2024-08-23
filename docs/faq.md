# FAQ

## To use on Deno Deploy

Deno Deploy has limited support for file system synchronization APIs. Therefore,
you cannot use `@miyauci/fs/deno` on Deno Deploy.

Instead, you can use `@miyauci/fs/node`. In addition, Deno runtime is available
for both `@miyauci/fs/deno` and `@miyauci/fs/node`.

Therefore, if your hosting is on Deno Deploy, it is recommended to use
`@miyauci/fs/node` for all of your codebase.
