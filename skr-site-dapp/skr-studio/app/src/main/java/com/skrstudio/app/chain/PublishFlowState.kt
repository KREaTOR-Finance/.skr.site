package com.skrstudio.app.chain

enum class PublishStep {
    IDLE,
    CHECKING_ENTITLEMENT,
    UPLOADING,
    AWAITING_PURCHASE_SIGNATURE,
    PURCHASE_SUBMITTED,
    PURCHASE_CONFIRMED,
    AWAITING_PUBLISH_SIGNATURE,
    PUBLISH_SUBMITTED,
    PUBLISH_CONFIRMED,
    FAILED,
}

data class PublishFlowState(
    val step: PublishStep = PublishStep.IDLE,
    val error: String? = null,
    val inFlight: Boolean = false,
) {
    val canTapAction: Boolean
        get() = !inFlight && step != PublishStep.PUBLISH_CONFIRMED
}

sealed interface PublishAction {
    data object Start : PublishAction
    data class Move(val step: PublishStep) : PublishAction
    data class Fail(val message: String) : PublishAction
    data object Reset : PublishAction
}

fun reducePublishState(state: PublishFlowState, action: PublishAction): PublishFlowState {
    return when (action) {
        PublishAction.Start -> state.copy(step = PublishStep.CHECKING_ENTITLEMENT, error = null, inFlight = true)
        is PublishAction.Move -> state.copy(step = action.step, error = null, inFlight = action.step != PublishStep.PUBLISH_CONFIRMED)
        is PublishAction.Fail -> state.copy(step = PublishStep.FAILED, error = action.message, inFlight = false)
        PublishAction.Reset -> PublishFlowState()
    }
}
