import { createSnapshotSerializer } from 'path-serializer'

const serializer: ReturnType<typeof createSnapshotSerializer> =
  createSnapshotSerializer()

export = serializer
