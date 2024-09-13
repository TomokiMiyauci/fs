# [1.0.0-beta.28](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.27...1.0.0-beta.28) (2024-09-13)


### Bug Fixes

* **deno:** fix parent entry referencing algorithm ([54bc97e](https://github.com/TomokiMiyauci/fs/commit/54bc97e65df09c5c96ce9f0a703d4be4469faa92))

# [1.0.0-beta.27](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.26...1.0.0-beta.27) (2024-09-13)


### Features

* **constant:** change aborted error message ([f6367eb](https://github.com/TomokiMiyauci/fs/commit/f6367ebd244cfde368c6e0ba2c4deb14e19646f0))
* **deno:** change permission denied error message ([47c0226](https://github.com/TomokiMiyauci/fs/commit/47c0226c19635acffe65dccfa221b8129a454405))

# [1.0.0-beta.26](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.25...1.0.0-beta.26) (2024-09-13)


### Bug Fixes

* **directory_entry:** fix to getting parent algorithm ([1b7f5eb](https://github.com/TomokiMiyauci/fs/commit/1b7f5eb8c0517adfbefbda086de52bed3347afbb))


### Features

* **directory_entry:** change iterable behaivor to skip when the entry is symlink ([8c7fa82](https://github.com/TomokiMiyauci/fs/commit/8c7fa821a0ad2cee5e5632a37dff58dd460f3bd9))

# [1.0.0-beta.25](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.24...1.0.0-beta.25) (2024-09-12)


### Bug Fixes

* **file_system:** fix locator comparison algorithm ([cb546a2](https://github.com/TomokiMiyauci/fs/commit/cb546a2f0bc2cea99ac86b949ea8905401a3ea80))

# [1.0.0-beta.24](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.23...1.0.0-beta.24) (2024-09-09)


### Features

* improve error message if access permission does not granted ([2dc67b1](https://github.com/TomokiMiyauci/fs/commit/2dc67b119e570b9dd95f6b2ae62e11bc88c8a7cf))

# [1.0.0-beta.23](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.22...1.0.0-beta.23) (2024-09-08)


### Bug Fixes

* **file_system:** fix to event's relativePathMovedFrom algorithm ([1e75883](https://github.com/TomokiMiyauci/fs/commit/1e75883a7792a00c221acf5bd72a2d5a880e5c73))

# [1.0.0-beta.22](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.21...1.0.0-beta.22) (2024-09-06)


### Features

* **file_system_change_record:** change module type to class ([53ea951](https://github.com/TomokiMiyauci/fs/commit/53ea9512d9f742b232ec02fc6b5dac5184289891))
* **file_system:** default to readonly for fields not specified in the specification ([6d162d2](https://github.com/TomokiMiyauci/fs/commit/6d162d206092a5e6cb264c0e10320f72ec500711))
* **src:** change constructor to protected ([5119eea](https://github.com/TomokiMiyauci/fs/commit/5119eea2ebe4259ab30b3dfb3ecec37f6533fc15))

# [1.0.0-beta.21](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.20...1.0.0-beta.21) (2024-09-06)


### Features

* **file_system_entry:** add `fileSystem` field to `FileSystemEntry` ([8bebcdb](https://github.com/TomokiMiyauci/fs/commit/8bebcdb9110a8502db7b8e703e591e178f6369f7))
* **file_system:** add `getPath` field to `FileSystem` interface ([be0f10b](https://github.com/TomokiMiyauci/fs/commit/be0f10bfd7b6b1a74cf1ffbb0779bd56fbdcc7b6))

# [1.0.0-beta.20](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.19...1.0.0-beta.20) (2024-09-05)


### Bug Fixes

* **file_system:** change to return as non-bucket file system handle ([a061500](https://github.com/TomokiMiyauci/fs/commit/a06150081e98feb01e7886259200df3b8186de0e))
* **node:** change `LocalFileSystem#getDirectory` to return as non-bucket file system handle ([dfa5934](https://github.com/TomokiMiyauci/fs/commit/dfa5934d240541e0b4f483de3cd467a2eb8ffeff))

# [1.0.0-beta.19](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.18...1.0.0-beta.19) (2024-09-05)


### Features

* export ValidFileName instead of isValidFileName function ([f09dd01](https://github.com/TomokiMiyauci/fs/commit/f09dd015f8de8c5336dda84cb14adfe92b5a6ae8))
* **mod:** export external module what is used public API surface as types ([5ebebba](https://github.com/TomokiMiyauci/fs/commit/5ebebba043fc0996d9033be94e17583092ae79de))

# [1.0.0-beta.18](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.17...1.0.0-beta.18) (2024-09-04)


### Features

* **mod:** export related modules ([b94d8ad](https://github.com/TomokiMiyauci/fs/commit/b94d8adf48f1f4627ef8e29df21e6f1de2fcb43d))

# [1.0.0-beta.17](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.16...1.0.0-beta.17) (2024-09-04)


### Features

* **deno:** export local file system and file system impl ([7cad79c](https://github.com/TomokiMiyauci/fs/commit/7cad79c51685856e6f9bc770268c047d94b2269b))
* **node:** export local file system and file system impl ([be97592](https://github.com/TomokiMiyauci/fs/commit/be975927cdf768f572d9232c054cecc121d60f14))
* stop exporting a partial class for StorageManager and make it interface ([8123b76](https://github.com/TomokiMiyauci/fs/commit/8123b76c45db3080452680d30a490035d6e405fb))

# [1.0.0-beta.16](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.15...1.0.0-beta.16) (2024-09-03)


### Features

* **file_entry:** add `parent` field to file system entry interface ([cdb0e67](https://github.com/TomokiMiyauci/fs/commit/cdb0e67c289a7535006d484eef1305a0f5504ad3))
* **mod:** stop exporting non-standard API ([c7121b4](https://github.com/TomokiMiyauci/fs/commit/c7121b479323fa32b2fd22066bb66e70ce6687e0))

# [1.0.0-beta.15](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.14...1.0.0-beta.15) (2024-08-31)


### Features

* **file_system_file_handle:** add checking in bucket file system ([7e07272](https://github.com/TomokiMiyauci/fs/commit/7e072728277652db4f2a6aefa6bc9e24ca7274d8))
* **file_system_sync_access_handle:** improve error message ([a10720e](https://github.com/TomokiMiyauci/fs/commit/a10720e96d8ee39c26600507aa475210db498ddb))

# [1.0.0-beta.14](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.13...1.0.0-beta.14) (2024-08-31)


### Features

* **file_system_handle:** export `isInBucketFileSystem` algorithm ([0d0827d](https://github.com/TomokiMiyauci/fs/commit/0d0827d4cd2d1805d5a0a02ed123361361ffffab))

# [1.0.0-beta.13](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.12...1.0.0-beta.13) (2024-08-25)


### Features

* rename `createFileSystemHandle` to `createNewFileSystemHandle` ([d7c177a](https://github.com/TomokiMiyauci/fs/commit/d7c177a024959450c240dd1cd90f62af618fefe4))
* rename public API ([04085de](https://github.com/TomokiMiyauci/fs/commit/04085dec74e1463facdc67eaeb5a5093ac677a01))

# [1.0.0-beta.12](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.11...1.0.0-beta.12) (2024-08-25)


### Bug Fixes

* **file_sysmte_observer:** fix to use file system queue ([6eea142](https://github.com/TomokiMiyauci/fs/commit/6eea1428de67def059a14454a638eeaf9123ef2b))


### Features

* **file_system:** change abstract class to interface ([4a6d43f](https://github.com/TomokiMiyauci/fs/commit/4a6d43facb18db00ee16835916103698e422d3e0))
* rename FileSystem to BucketFileSystem ([82323d9](https://github.com/TomokiMiyauci/fs/commit/82323d96fd68de5434ffe43b212f3fb795b98718))
* **storage_manager:** add BucketFileSystem interface, add checking existance of file system ([09894f0](https://github.com/TomokiMiyauci/fs/commit/09894f05b796cd70456c55e52907341cc418a6f9))
* update deps ([5c98524](https://github.com/TomokiMiyauci/fs/commit/5c9852403ffa1de4629566d9dd6d189df82b92fe))

# [1.0.0-beta.11](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.10...1.0.0-beta.11) (2024-08-23)


### Bug Fixes

* **file_system:** add `mtime` fallback value ([4c8ca79](https://github.com/TomokiMiyauci/fs/commit/4c8ca79e8d785a1de2fa0f2202aeecd3194bc8b5))

# [1.0.0-beta.10](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.9...1.0.0-beta.10) (2024-08-23)


### Features

* **deno:** improve permission error message ([17afe90](https://github.com/TomokiMiyauci/fs/commit/17afe90a14302b5fafb1bd567b13f24712c7b41c))
* **file_system:** add watching file system feature to node file system ([d409abf](https://github.com/TomokiMiyauci/fs/commit/d409abfd4dfef9b817edd916b25231196dfc1ee1))
* **file_system:** change file system constructor argument to optional ([611b214](https://github.com/TomokiMiyauci/fs/commit/611b214ef7764d25a4dcf9cd59fbac6fe0275e69))

# [1.0.0-beta.9](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.8...1.0.0-beta.9) (2024-08-23)


### Features

* **node:** add file system class for node.js, add node endpoint ([f9ce721](https://github.com/TomokiMiyauci/fs/commit/f9ce7218bd16043053a4ad808e5eea707bea0545))

# [1.0.0-beta.8](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.7...1.0.0-beta.8) (2024-08-23)


### Features

* **file_system:** file system to be disposable ([5cd8001](https://github.com/TomokiMiyauci/fs/commit/5cd800146ebe42bc493563d29eb66a8ac3912125))

# [1.0.0-beta.7](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.6...1.0.0-beta.7) (2024-08-22)


### Bug Fixes

* **adaptor:** quit using FsFile all over the place ([087567e](https://github.com/TomokiMiyauci/fs/commit/087567e7e5fcb301aade23ac10aaa5b52a615df3))


### Features

* **file_system_entry:** change FileEntry interface to add accessor ([6f8fa9b](https://github.com/TomokiMiyauci/fs/commit/6f8fa9b0ce97f0b218e98389318d97c4cb35aa4a))
* **file_system:** map renaming event to "moved" ([15fce0b](https://github.com/TomokiMiyauci/fs/commit/15fce0b27c5614f48b43cdd5dc6807332650096c))

# [1.0.0-beta.6](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.5...1.0.0-beta.6) (2024-08-20)


### Bug Fixes

* fix file path when reading ([4fa160f](https://github.com/TomokiMiyauci/fs/commit/4fa160feb3f89b299da7197210832640b4d70995))

# [1.0.0-beta.5](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.4...1.0.0-beta.5) (2024-08-20)


### Features

* change non-standard constructor interface ([baa8f31](https://github.com/TomokiMiyauci/fs/commit/baa8f311e5844983287909fcba97ad16b7e939b8))
* change of reference to internal slot ([874375f](https://github.com/TomokiMiyauci/fs/commit/874375f4d454a87606377f0cc9a0e8a60a163601))
* remove non-standard constructor interface ([8d0734c](https://github.com/TomokiMiyauci/fs/commit/8d0734c4cba3bdc31489877879e8651c2251c1bb))

# [1.0.0-beta.4](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.3...1.0.0-beta.4) (2024-08-20)


### Features

* **mod:** export all modules defined in specification ([e9aa6cd](https://github.com/TomokiMiyauci/fs/commit/e9aa6cd467e51f8515d647d4ddce2833d590250b))

# [1.0.0-beta.3](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.2...1.0.0-beta.3) (2024-08-20)


### Features

* **adaptor:** add watching file system feature ([a78f39b](https://github.com/TomokiMiyauci/fs/commit/a78f39bddc42e4d0f907d265e48a1d1e28e7996f))
* reimplement file system observer ([4bddd98](https://github.com/TomokiMiyauci/fs/commit/4bddd98421807c0d7fc9a914f89c3f4abced813a))
* **watcher:** add file watcher based on event target ([53aaa13](https://github.com/TomokiMiyauci/fs/commit/53aaa1393f47103b0d994dd880533f6c30222e28))

# [1.0.0-beta.2](https://github.com/TomokiMiyauci/fs/compare/1.0.0-beta.1...1.0.0-beta.2) (2024-08-18)


### Features

* **file_system_observer:** add FileSystemObserver implementation ([16c2e48](https://github.com/TomokiMiyauci/fs/commit/16c2e4858672f35566289025934c848bd8afd7e5))

# 1.0.0-beta.1 (2024-08-17)


### Bug Fixes

* **async:** fix to async iterable member of entries ([d2ef448](https://github.com/TomokiMiyauci/fs/commit/d2ef4484b4921f312b5ed627e0c1fb5a57a8869e))


### Features

* add file system observer internal slot and algorithm, types ([2ab728c](https://github.com/TomokiMiyauci/fs/commit/2ab728c701dc0857cb6139047f990dde939c69b2))
* add throwing type error ([dc4ab6e](https://github.com/TomokiMiyauci/fs/commit/dc4ab6e0bb92d9b182cb63673a214253c207e2a9))
* add user agent interface to remove side effect ([5ce635d](https://github.com/TomokiMiyauci/fs/commit/5ce635d0e0a25620df973e71c8530bd3a471ffd6))
* add write effect ([782c6dd](https://github.com/TomokiMiyauci/fs/commit/782c6dd70d3ca213cb1eddb6d21e1e31dd545de4))
* change children interface, remove fs hooks interface ([3a21d88](https://github.com/TomokiMiyauci/fs/commit/3a21d88f0d9cea954fbf245b5e696d71571bbf79))
* change construction interface ([4774735](https://github.com/TomokiMiyauci/fs/commit/4774735aad956c98f6330386cf3a92b7cb783ba7))
* change non-standard interface ([ac031b5](https://github.com/TomokiMiyauci/fs/commit/ac031b5db282eb61955ef2e3bf78a69e11837241))
* **deno:** add adaptor for deno ([4602906](https://github.com/TomokiMiyauci/fs/commit/46029066276da0a50e71a1b0b421ee47c36d8916))
* **file_system_file_handle:** disable blog data item ([2870939](https://github.com/TomokiMiyauci/fs/commit/287093963b579f890975568f4ddee587c4c97b58))
* **file_system_observer:** add basic FileSystemObserver impl ([dec8d89](https://github.com/TomokiMiyauci/fs/commit/dec8d895c758e0341655993e2815e03f6bc21b82))
* **file_system_sync_access_handle:** add argument validation ([edab05d](https://github.com/TomokiMiyauci/fs/commit/edab05dc5592ee8f74034c19df9592a821d9d5ea))
* **file_system_sync_access_handle:** add argument validation to truncate method ([bba3f72](https://github.com/TomokiMiyauci/fs/commit/bba3f7209c916198df901558145ae5cc5294c0c3))
* **file_system_sync_access_handle:** implement read and write method ([02c1584](https://github.com/TomokiMiyauci/fs/commit/02c1584efccd801e1ee300721e4b4f96f7ecccf1))
* **file_system_writable_file_stream:** implement truncate method ([fe9f46e](https://github.com/TomokiMiyauci/fs/commit/fe9f46e54d996ab73477b8cd50b5111ff152a48b))
* **file_system:** add file system API implement ([b0056f8](https://github.com/TomokiMiyauci/fs/commit/b0056f8683621acf770fc74d446a85928637eb11))
* **file_system:** rename field of IO interface ([17707cf](https://github.com/TomokiMiyauci/fs/commit/17707cf10be6e87f08c568616482b2ec155505ce))
* **src:** change constructor argument interface ([b009755](https://github.com/TomokiMiyauci/fs/commit/b009755a863e8409e42765809adeb584fb061b7e))
* **src:** change constructor interface to accept context and options ([b87c12d](https://github.com/TomokiMiyauci/fs/commit/b87c12d5cc1f942199f2eb3d3e7f1aa9581b34d0))
* **storage_manager:** add partial implementation of storage manager class ([2f51ef5](https://github.com/TomokiMiyauci/fs/commit/2f51ef5502079e68b5a7de88edce1c344e4ac442))
* **symbol:** remove non-defined internal slot accessor ([9af0848](https://github.com/TomokiMiyauci/fs/commit/9af0848a322e68a94d3fd3dc7fc62859a226f572))
* **type:** add user implementation definition field ([b0f989d](https://github.com/TomokiMiyauci/fs/commit/b0f989db1d3ef1b1aed407cd36d33f73b8c090bc))
* **type:** change public types interface ([92a87a1](https://github.com/TomokiMiyauci/fs/commit/92a87a17e844c3a267111398b4f7cb5f3fe6ac8f))
* **type:** change request and query access return type ([54e3820](https://github.com/TomokiMiyauci/fs/commit/54e3820acf6b74e330ebca05f50e512d0b75ca22))
* **type:** use list instead of array ([f4c41d2](https://github.com/TomokiMiyauci/fs/commit/f4c41d2e7f4f726a6adbcceec54ced2c840dfd9d))
