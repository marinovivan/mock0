const fs = require('fs')

let mocking
let capturing
let captureFile
let interestingHeaders
let captured = []

let httpInstance
const http = () => {
  if (!httpInstance) {
    httpInstance = require('axios').default
  }
  return httpInstance
}

let interceptorInstance
const interceptor = () => {
  if (!interceptorInstance) {
    interceptorInstance = require('mitm')()
  }
  return interceptorInstance
}

let interceptorInstalled
const installInterceptor = () => {
  if (!interceptorInstalled) {
    interceptor().on('request', requestInterceptor)
    interceptorInstalled = true
  }
}

let mockDataInstance
const mockData = () => {
  if (!mockDataInstance) {
    mockDataInstance = JSON.parse(fs.readFileSync(captureFile))
  }
  return mockDataInstance
}

function saveCaptureFile() {
  fs.writeFileSync(captureFile, JSON.stringify(captured, null, 2))
}

function getUriFromRequest(request) {
  const protocol = request.connection.encrypted ? 'https://' : 'http://'
  const host = request.headers.host
  const path = request.url
  return protocol + host + path
}

function findHeaderIncase(headerToFindLowercase, headers) {
  for (let header of Object.keys(headers)) {
    if (headerToFindLowercase === header.toLowerCase()) {
      return header
    }
  }
  return undefined
}

function extractHeadersFromRequest(request) {
  const extractedHeaders = { }
  for (let header of interestingHeaders) {
    const requestHeader = findHeaderIncase(header.toLowerCase(), request.headers)
    if (requestHeader) {
      extractedHeaders[requestHeader] = request.headers[requestHeader]
    }
  }
  return extractedHeaders
}

async function waitRequestData(request) {
  if (request.method === 'GET') {
    return ''
  }
  return new Promise((resolve, reject) => {
    request.on('data', data => resolve(data))
    request.on('error', err => reject(err))
  })
}

function saveCapturedRequest(request, requestBody) {
  const capturedRequest = {
    method: request.method, 
    uri: getUriFromRequest(request),
    headers: extractHeadersFromRequest(request),
    body: requestBody.toString()
  }
  captured.push({ request: capturedRequest })
}

function saveCapturedResponse(statusCode, body) {
  const capturedResponse = { 
    statusCode, 
    headers: [], 
    body
  }
  const firstCaptureMissingResponse = captured.find(capture => !capture.response)
  firstCaptureMissingResponse.response = capturedResponse
  saveCaptureFile()
}

function headersMatch(headersToFind, headers) {
  for (let headerToFind of Object.keys(headersToFind)) {
    const foundHeader = findHeaderIncase(headerToFind.toLowerCase(), headers)
    if (!foundHeader || headers[foundHeader].toLowerCase() !== headersToFind[headerToFind].toLowerCase()) {
      return false
    }
  }
  return true
}

function getMockResponse(request, requestBody) {
  const mockResponses = mockData()
  for (let mock of mockResponses) {
    if (mock.request.uri.toLowerCase() === getUriFromRequest(request).toLowerCase()
      && mock.request.method.toLowerCase() === request.method.toLowerCase()
      && mock.request.body === requestBody
      && headersMatch(mock.request.headers, request.headers)) {

        return mock.response
      }
  }
  return undefined
}

async function requestInterceptor(request, interceptedResponse) {

  if (capturing) {

    const requestBody = await waitRequestData(request)

    saveCapturedRequest(request, requestBody)

    forwardedRequest = { 
      baseURL: getUriFromRequest(request),
      method: request.method,
      data: requestBody.toString(),
      headers: request.headers 
    }

    interceptor().disable()
    const response = await http().request(forwardedRequest).catch(err => { return err.response })
    interceptor().enable()

    const responseBodyString = response && response.data ? JSON.stringify(response.data, null, 2) : ''
    const responseStatus = response && response.status || 500
    const responseHeaders = response && response.headers || { }

    saveCapturedResponse(responseStatus, responseBodyString)

    interceptedResponse.headers = responseHeaders
    interceptedResponse.statusCode = responseStatus
    interceptedResponse.end(responseBodyString)
  }

  if (mocking) {
    const requestBody = await waitRequestData(request)
    const defaultMockResponse = { statusCode: 500, headers: [], body: '' }
    const mockedResponse = getMockResponse(request, requestBody.toString()) || defaultMockResponse
    interceptedResponse.statusCode = mockedResponse.statusCode
    interceptedResponse.end(mockedResponse.body)
  }
}

function mock(file) {
  capturing = false
  mocking = true
  captureFile = file
  installInterceptor()
}

function capture(file, _interestingHeaders) {
  capturing = true
  mocking = false
  captureFile = file
  interestingHeaders = _interestingHeaders || []
  installInterceptor()
}

module.exports = {
  mock,
  capture
}
