import Foundation
import CallKit
import React
import TwilioVoice

@objc(NativeCallKitModule)
class NativeCallKitModule: NSObject, CXProviderDelegate {

  private let callKitProvider: CXProvider
  private let callKitCallController = CXCallController()
  private var pendingAnswerAction: CXAnswerCallAction?
  private var callSidToUUID: [String: UUID] = [:]
  private var uuidToCallSid: [UUID: String] = [:]

  override init() {
    let config = CXProviderConfiguration(localizedName: "Glō")
    config.maximumCallGroups = 1
    config.maximumCallsPerCallGroup = 1
    config.supportsVideo = false
    callKitProvider = CXProvider(configuration: config)
    super.init()
    callKitProvider.setDelegate(self, queue: nil)
  }

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func reportIncomingCall(_ callSid: String,
                                 callerName: String,
                                 resolver resolve: @escaping RCTPromiseResolveBlock,
                                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    let uuid = UUID()
    callSidToUUID[callSid] = uuid
    uuidToCallSid[uuid] = callSid

    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: callerName)
    update.hasVideo = false

    callKitProvider.reportNewIncomingCall(with: uuid, update: update) { error in
      if let error = error {
        print("[NATIVE_CALLKIT] reportNewIncomingCall error: \(error.localizedDescription)")
        reject("CALLKIT_ERROR", error.localizedDescription, error)
      } else {
        print("[NATIVE_CALLKIT] reported incoming call \(callSid) → \(uuid)")
        resolve(uuid.uuidString)
      }
    }
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    print("[NATIVE_CALLKIT] CXAnswerCallAction intercepted — holding for JS")
    pendingAnswerAction = action
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    print("[NATIVE_CALLKIT] CXEndCallAction — ending call")
    if let uuid = action.callUUID as UUID?,
       let callSid = uuidToCallSid[uuid] {
      callSidToUUID.removeValue(forKey: callSid)
      uuidToCallSid.removeValue(forKey: uuid)
    }
    action.fulfill()
  }

  func providerDidReset(_ provider: CXProvider) {
    print("[NATIVE_CALLKIT] providerDidReset")
    pendingAnswerAction = nil
  }

  @objc func fulfillAnswer(_ callSid: String,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let action = pendingAnswerAction else {
      print("[NATIVE_CALLKIT] no pending action to fulfill for \(callSid)")
      reject("NO_ACTION", "No pending CallKit action", nil)
      return
    }
    action.fulfill()
    pendingAnswerAction = nil
    print("[NATIVE_CALLKIT] CallKit action fulfilled for \(callSid)")
    TwilioVoice.accept()
    print("[NATIVE_CALLKIT] TwilioVoice.accept() called")
    resolve(true)
  }

  @objc func rejectCall(_ callSid: String,
                         resolver resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    if let action = pendingAnswerAction {
      action.fail()
      pendingAnswerAction = nil
    }
    if let uuid = callSidToUUID[callSid] {
      let endAction = CXEndCallAction(call: uuid)
      callKitCallController.request(CXTransaction(action: endAction)) { error in
        if let error = error {
          print("[NATIVE_CALLKIT] end call error: \(error.localizedDescription)")
        }
      }
      callSidToUUID.removeValue(forKey: callSid)
      uuidToCallSid.removeValue(forKey: uuid)
    }
    print("[NATIVE_CALLKIT] call rejected for \(callSid)")
    resolve(true)
  }
}
