/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export default {
  "github": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "CreateIssue": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/issues",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "issueBasicDetails",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetIssues": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/issues",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "milestone",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "state",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "assignee",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "creator",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "mentioned",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "labels",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "direction",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "since",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetRepositoryPublicKey": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/actions/secrets/public-key",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "CreateUpdateRepositorySecret": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/actions/secrets/{secretName}",
        "method": "PUT",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "secretName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "void"
          },
          "204": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "CreateRepositoryUsingTemplate": {
        "path": "/{connectionId}/repos/{templateOwner}/{templateRepository}/generate",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "templateOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "templateRepository",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetRepositoryById": {
        "path": "/{connectionId}/repositories/{repositoryId}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryId",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "CreateReference": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/git/refs",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetReference": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/git/ref/{reference}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "reference",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "MergePullRequest": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls/{pullNumber}/merge",
        "method": "PUT",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "pullNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "405": {
            "type": "void"
          },
          "409": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetPullRequest": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls/{pullNumber}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "pullNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UpdatePullRequest": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls/{pullNumber}",
        "method": "PATCH",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "pullNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetPullRequestFiles": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls/{pullNumber}/files",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "pullNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "RequestReviewersPullRequest": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls/{pullNumber}/requested_reviewers",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "pullNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "RemoveReviewersPullRequest": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls/{pullNumber}/requested_reviewers",
        "method": "DELETE",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "pullNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "CreatePullRequest": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetPullRequests": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/pulls",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "state",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "head",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "base",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "direction",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "304": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "CreateRepositoryDispatchEvent": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/dispatches",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "body",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          },
          "422": {
            "type": "void"
          }
        }
      },
      "CompareRepositoryCommits": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/compare/{base}...{head}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "base",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "head",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          }
        }
      },
      "AddSelectedRepoToOrgSecret": {
        "path": "/{connectionId}/orgs/{repositoryOwner}/actions/secrets/{secretName}/repositories/{repositoryId}",
        "method": "PUT",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryId",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "secretName",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          },
          "409": {
            "type": "void"
          }
        }
      },
      "RemoveSelectedRepoFromOrgSecret": {
        "path": "/{connectionId}/orgs/{repositoryOwner}/actions/secrets/{secretName}/repositories/{repositoryId}",
        "method": "DELETE",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryId",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "secretName",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "void"
          },
          "409": {
            "type": "void"
          }
        }
      },
      "WebhookPullRequestTrigger": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/hooks",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Accept",
            "in": "header",
            "required": true,
            "type": "string"
          },
          {
            "name": "Request body of webhook",
            "in": "body",
            "required": false,
            "type": "object"
          }
        ],
        "responseInfo": {
          "201": {
            "type": "object"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "DeleteWebhookTrigger": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/hooks/{webhookId}",
        "method": "DELETE",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "webhookId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "IssueOpened": {
        "path": "/{connectionId}/trigger/issueOpened",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "IssueClosed": {
        "path": "/{connectionId}/trigger/issueClosed",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "IssueAssigned": {
        "path": "/{connectionId}/trigger/issueAssigned",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "400": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetIssueNum": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/issues/{issueNumber}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "issueNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UpdateIssueNum": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/issues/{issueNumber}",
        "method": "PATCH",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "issueNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "issueUpdate",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "301": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "410": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "503": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "UpdateMilestone": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/milestones/{milestoneNumber}",
        "method": "PATCH",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "milestoneNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "milestoneUpdate",
            "in": "body",
            "required": false,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "301": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "410": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "503": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetUser": {
        "path": "/{connectionId}/user",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "304": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "SearchGithubWithQuery": {
        "path": "/{connectionId}/graphql",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "query",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          },
          "304": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetAssignees": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/assignees",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "ListCollaborators": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/collaborators",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "checkCollaborator": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/collaborators/{userName}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "userName",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "204": {
            "type": "object"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetMilestones": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/milestones",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "state",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "direction",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetLabels": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/labels",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetIssueLabels": {
        "path": "/{connectionId}/repos/{repositoryOwner}/{repositoryName}/issues/{issueNumber}/labels",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryName",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "issueNumber",
            "in": "path",
            "required": true,
            "type": "integer"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "301": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "410": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetRepos": {
        "path": "/{connectionId}/users/{repositoryOwner}/repos",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "type",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "direction",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetOrgRepos": {
        "path": "/{connectionId}/orgs/{repositoryOwner}/repos",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "repositoryOwner",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "type",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "direction",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "GetUserRepos": {
        "path": "/{connectionId}/user/repos",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "visibility",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "affiliation",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "since",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "before",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "type",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "direction",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          },
          "304": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "SearchIssues": {
        "path": "/{connectionId}/search/issues",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "q",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "sort",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "order",
            "in": "query",
            "required": false,
            "type": "string"
          },
          {
            "name": "per_page",
            "in": "query",
            "required": false,
            "type": "integer"
          },
          {
            "name": "page",
            "in": "query",
            "required": false,
            "type": "integer"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          },
          "304": {
            "type": "void"
          },
          "401": {
            "type": "void"
          },
          "403": {
            "type": "void"
          },
          "404": {
            "type": "void"
          },
          "422": {
            "type": "void"
          },
          "500": {
            "type": "void"
          },
          "503": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      },
      "InvokeMCPServer": {
        "path": "/{connectionId}/mcp",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Mcp-Session-Id",
            "in": "header",
            "required": false,
            "type": "string"
          },
          {
            "name": "queryRequest",
            "in": "body",
            "required": false,
            "type": "object"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "void"
          },
          "default": {
            "type": "void"
          }
        }
      }
    }
  }
};
