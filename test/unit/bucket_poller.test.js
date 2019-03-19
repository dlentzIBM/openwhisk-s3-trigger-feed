import test from 'ava'

const crypto = require("crypto")
const BucketPoller = require('../../lib/bucket_poller.js')
const BucketFiles = require('../../lib/bucket_files.js')

const BUCKET = 'some-bucket'
const test_endpoint = 'https://s3.eu-gb.cloud-object-storage.appdomain.cloud'
const logger = { debug: () => {}, info: () => {} }
const client = {
  config: {
    endpoint: test_endpoint
  },
  listObjects: options => {
    t.is(options.Bucket, BUCKET)
    return { promise: () => Promise.resolve(results) }
  }
}

test('should queue all returned file changes', async t => {
  t.plan(1)
  const previous_files = []
  const current_files = []

  const total_files = 100

  for (let idx = 0; idx < total_files; idx++) {
    const Key = crypto.randomBytes(20).toString('hex');
    const ETag = crypto.randomBytes(40).toString('hex');
    current_files.push({Key, ETag})
  }

  const bucket_files = {
    current: () => current_files,
    file_changes: BucketFiles(client).file_changes
  }

  const cache = {
    get: () => previous_files,
    set: () => {}
  }

  const push = async item => {
    t.deepEqual(item, BucketFiles(client).file_changes(previous_files, current_files))
  }

  const bucket_poller = BucketPoller(bucket_files, BUCKET, cache, { push }, logger)
  await bucket_poller()
})

test('should not queue anything with no file changes', async t => {
  const current_files = []

  const total_files = 100

  for (let idx = 0; idx < total_files; idx++) {
    const Key = crypto.randomBytes(20).toString('hex');
    const ETag = crypto.randomBytes(40).toString('hex');
    current_files.push({Key, ETag})
  }

  const previous_files = current_files.slice()

  const bucket_files = {
    current: () => current_files,
    file_changes: BucketFiles(client).file_changes
  }

  let called = false

  const cache = {
    get: () => previous_files,
    set: () => called = true
  }

  const bucket_poller = BucketPoller(bucket_files, BUCKET, cache, { push: () => called = true }, logger)
  await bucket_poller()

  t.false(called)
})
