#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NativeCallKitModule, NSObject)

RCT_EXTERN_METHOD(reportIncomingCall:(NSString *)callSid
                  callerName:(NSString *)callerName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fulfillAnswer:(NSString *)callSid
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(rejectCall:(NSString *)callSid
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
