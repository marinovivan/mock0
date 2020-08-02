# Mock0

Mock0 is a zero effort http(s) mocking library with build-in capture to file solution.
It can intercept http(s) traffic and capture requests and responses in a JSON formatted file.
Once capture is done, it can be used with zero effort to play back responses for
the captured requests and use it as mock for unit tests.

## Capturing

The example code below starts capturing requests and responses to a file:

  ```javascript
  require('mock0').capture('mock-data.json', ['x-amz-target'])
  ```

Second parameter of the `capture` method (in this example `['x-amz-target']`) is an array of 
headers that will be saved. Other headers will be dropped.

That's it. The file saved above will look like this example:

  ```json
  [
    {
      "request": {
        "method": "POST",
        "uri": "https://codecommit.eu-central-1.amazonaws.com/",
        "headers": {
          "x-amz-target": "CodeCommit_20150413.ListRepositories"
        },
        "body": "{}"
      },
      "response": {
        "statusCode": 200,
        "headers": [],
        "body": "{\n  \"repositories\": [\n    {\n      \"repositoryId\": \"882407d2-17b3-4b9d-a420-8bb1f8730822\",\n      \"repositoryName\": \"test1\"\n    }\n  ]\n}"
      }
    }
  ]
  ```

This request was made by [aws-sdk][aws-sdk] node module by the following code:

  ```javascript
  const AWS = require('aws-sdk')
  AWS.config.region = 'eu-central-1'
  AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: 'dev' })
  const CodeCommit = new AWS.CodeCommit()
  CodeCommit.listRepositories({ }, (err, data) => { console.log(err, data) })
  ```

## Mocking

The example code below starts playing back the requests and responses from the previously captured file:

  ```javascript
  require('mock0').mock('mock-data.json')
  ```

Now all setup. If you run the code below with fake credentials, it will show the exact result as the one which has proper access, because now the mock0 will replay back the captured response.

  ```javascript
  const AWS = require('aws-sdk')
  AWS.config.region = 'eu-central-1'
  AWS.config.credentials = { accessKeyId: 'fake-key', secretAccessKey: 'fake-secret' }
  const CodeCommit = new AWS.CodeCommit()
  CodeCommit.listRepositories({ }, (err, data) => { console.log(err, data) })
  ```

## Installing

  ```
  npm install --save mock0
  ```

Versioning of this module follows the [Schemantic Versioning][semver] standard.
The current version depend on the following two external modules: [axios][axios] and [mitm][mitm].
This might change in the future.

## About

If you find an issues or you have a feature request, please feel free to contact me directly [Ivan Marinov][email], or create an issue in the issue tracker.

[aws-sdk]: https://www.npmjs.com/package/aws-sdk
[semver]: http://semver.org/
[axios]: https://github.com/axios/axios
[mitm]: https://github.com/moll/node-mitm
[email]: mailto:marinov.ivan.miklos@gmail.com
