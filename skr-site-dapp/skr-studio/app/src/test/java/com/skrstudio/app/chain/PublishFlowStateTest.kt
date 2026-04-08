package com.skrstudio.app.chain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PublishFlowStateTest {
    @Test
    fun `start moves to checking entitlement and locks action`() {
        val state = reducePublishState(PublishFlowState(), PublishAction.Start)
        assertEquals(PublishStep.CHECKING_ENTITLEMENT, state.step)
        assertFalse(state.canTapAction)
    }

    @Test
    fun `failed state unlocks action and keeps message`() {
        val state = reducePublishState(PublishFlowState(), PublishAction.Fail("wallet rejected"))
        assertEquals(PublishStep.FAILED, state.step)
        assertEquals("wallet rejected", state.error)
        assertTrue(state.canTapAction)
    }

    @Test
    fun `confirmed state keeps action disabled`() {
        val state = reducePublishState(PublishFlowState(), PublishAction.Move(PublishStep.PUBLISH_CONFIRMED))
        assertFalse(state.canTapAction)
    }
}
