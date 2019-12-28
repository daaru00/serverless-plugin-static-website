const beforePackageFinalizeController = require('./beforePackageFinalize')
const beforeRemoveController = require('./beforeRemove')
const displayServiceInfoController = require('./displayServiceInfo')

module.exports = {
  beforePackageFinalize: beforePackageFinalizeController,
  beforeRemove: beforeRemoveController,
  displayServiceInfo: displayServiceInfoController
}
