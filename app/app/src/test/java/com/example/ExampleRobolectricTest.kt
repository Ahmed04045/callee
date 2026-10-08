package com.example

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.data.local.AppDatabase
import com.example.data.local.VlsonneDao
import com.example.data.model.ClubEntity
import com.example.data.model.MembershipEntity
import com.example.data.model.UserEntity
import com.example.data.repository.InitialData
import com.example.data.repository.VlsonneRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

    private lateinit var database: AppDatabase
    private lateinit var dao: VlsonneDao
    private lateinit var repository: VlsonneRepository
    private val testDispatcher = StandardTestDispatcher()
    private val testScope = TestScope(testDispatcher)

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        dao = database.vlsonneDao()
        repository = VlsonneRepository(dao, testScope)
    }

    @After
    fun teardown() {
        database.close()
    }

    @Test
    fun `read app name string from context`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("Circosodal", appName)
    }

    @Test
    fun `verify initial udst clubs count is 33`() {
        assertEquals(33, InitialData.udstClubs.size)
    }

    @Test
    fun `verify 5-club maximum membership constraint`() = runTest {
        val testEmail = "test_${java.util.UUID.randomUUID().toString().take(8)}@test.local"
        val testPass = "test_pass_${java.util.UUID.randomUUID().toString().take(8)}"
        val reg = repository.registerAccount("Test User", testEmail, testPass, "udst", "", "")
        val user = (reg as VlsonneRepository.AuthResult.Success).user
        dao.insertClubs(InitialData.udstClubs)

        // Join 5 clubs successfully
        val first5Clubs = InitialData.udstClubs.take(5)
        for (club in first5Clubs) {
            val result = repository.joinClub(user.id, club.id)
            assertTrue("Expected success for club ${club.id}", result is VlsonneRepository.JoinResult.Success)
        }

        val membershipCount = repository.getUserMembershipCount(user.id).first()
        assertEquals(5, membershipCount)

        // Attempt to join 6th club must be blocked with LimitReached
        val sixthClub = InitialData.udstClubs[5]
        val blockedResult = repository.joinClub(user.id, sixthClub.id)
        assertTrue("Sixth club join must fail with LimitReached", blockedResult is VlsonneRepository.JoinResult.LimitReached)

        // Count must still be strictly 5
        assertEquals(5, repository.getUserMembershipCount(user.id).first())

        // Leave one club and then join 6th club
        repository.leaveClub(user.id, first5Clubs[0].id)
        assertEquals(4, repository.getUserMembershipCount(user.id).first())

        val retryResult = repository.joinClub(user.id, sixthClub.id)
        assertTrue("Expected success after freeing a slot", retryResult is VlsonneRepository.JoinResult.Success)
        assertEquals(5, repository.getUserMembershipCount(user.id).first())
    }

    @Test
    fun `verify member status unlocks membership access`() = runTest {
        val testEmail = "test_${java.util.UUID.randomUUID().toString().take(8)}@test.local"
        val testPass = "test_pass_${java.util.UUID.randomUUID().toString().take(8)}"
        val reg = repository.registerAccount("Test User", testEmail, testPass, "udst", "", "")
        val user = (reg as VlsonneRepository.AuthResult.Success).user
        val club = InitialData.udstClubs.first()
        dao.insertClubs(listOf(club))

        // Initially not a member
        assertFalse(repository.isClubMember(user.id, club.id).first())

        // Join club
        repository.joinClub(user.id, club.id)
        assertTrue(repository.isClubMember(user.id, club.id).first())

        // Verify joined club list contains this club
        val joinedIds = repository.getUserJoinedClubIds(user.id).first()
        assertTrue(joinedIds.contains(club.id))
    }
}
