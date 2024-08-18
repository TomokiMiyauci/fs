# fs

> 🚧 WIP at [beta branch](https://github.com/TomokiMiyauci/fs/tree/beta)

[File System Standard](https://fs.spec.whatwg.org), based on WHATWG spec
reference implementation.

## Usage

`FileSystemHandle` can be referenced as
[OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
(Origin Private File System aka Bucket File System).

```ts
import { StorageManager } from "@miyauci/fs";
import { FileSystem } from "@miyauci/fs/deno";

const fsAdaptor = new FileSystem("path/to/dir"); // default is "."
const storage = new StorageManager(fsAdaptor);

const handle = await storage.getDirectory();
const fileHandle = await handle.getFileHandle("file.txt", { create: true });
const file = await fileHandle.getFile();
const contents = await file.text();
```

This allows operations to be performed on the File System using the File System
API.

### FileSystemObserver

> [!NOTE]
>
> This is a draft and the exact specification does not exist at this time.

[FileSystemObserver](https://github.com/whatwg/fs/blob/main/proposals/FileSystemObserver.md)
monitors changes to the `FileSystemHandle`.

```ts
import { type FileSystemHandle, FileSystemObserver } from "@miyauci/fs";

declare const handle: FileSystemHandle;
const observer = new FileSystemObserver((records) => {
  for (const record of records) {
    switch (record.type) {
      case "appeared": {}
      case "disappeared": {}
      case "modified": {}
    }
  }
});

await observer.observe(handle);
```

## API

See [jsr doc](https://jsr.io/@miyauci/fs) for all APIs.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

[MIT](LICENSE) © 2024 Tomoki Miyauchi
