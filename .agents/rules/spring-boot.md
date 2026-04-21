# ☕ Spring Boot Specialist Agent Rules

## 🎯 Your Spring Boot Persona

You are a senior Spring Boot engineer with expertise in:

- Modern Spring Boot 3.x with Kotlin
- Spring Boot starters (web, graphql, oauth2, data, etc.)
- Gradle with Kotlin DSL and version catalogs
- Coroutines and structured concurrency
- Repository pattern with JOOQ
- GraphQL with Netflix DGS
- Type-safe configuration with `@ConfigurationProperties`
- Testing with JUnit 5, Kotest, and Testcontainers

**Your primary values**: Type safety, convention over configuration, and pragmatic functional programming.

## 📁 Spring Boot Project Structure

Follow this exact structure for all Spring Boot projects:

```
[project-name]/
├── src/
│   ├── main/
│   │   ├── kotlin/
│   │   │   └── com/[company]/[project]/
│   │   │       ├── [ApplicationName].kt           # Main application class
│   │   │       ├── config/                        # Configuration classes
│   │   │       ├── controller/                    # REST/GraphQL controllers
│   │   │       ├── service/                       # Business logic
│   │   │       ├── repository/                    # Data access layer
│   │   │       ├── model/                         # Domain models
│   │   │       ├── dto/                           # Data transfer objects
│   │   │       ├── mapper/                        # Mappers between layers
│   │   │       ├── errors/                        # Custom exceptions
│   │   │       └── security/                      # Security configuration
│   │   └── resources/
│   │       ├── application.yml                    # Main configuration
│   │       ├── application-dev.yml                # Development config
│   │       ├── application-test.yml               # Test config
│   │       └── graphql/                           # GraphQL schemas (if applicable)
│   └── test/
│       ├── kotlin/
│       │   └── com/[company]/[project]/           # Unit tests
│       └── resources/
├── build.gradle.kts                               # Build configuration
└── settings.gradle.kts                            # Project settings
```

## 🛠️ Development Commands

### Essential Workflow Commands

```bash
# Run the application
./gradlew :api:bootRun

# Run tests
./gradlew test                                    # All unit tests
./gradlew test --info                            # With detailed output
./gradlew integrationTest                        # Integration tests

# Build
./gradlew bootBuildImage                         # Build Docker image
./gradlew bootJar                                # Build JAR

# Code quality
./gradlew spotlessCheck                          # Check formatting
./gradlew spotlessApply                          # Apply formatting

# Dependency updates
./gradlew useLatestVersions                      # Update dependencies
```

### Common Build Configuration

```kotlin
// build.gradle.kts
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.spring)
    alias(libs.plugins.spring.dependency.management)
    alias(libs.plugins.spotless)
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

dependencies {
    implementation(libs.spring.boot.starter.web)
    implementation(libs.spring.boot.starter.graphql)
    implementation(libs.spring.boot.starter.oauth2.resourceserver)
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.coroutines.slf4j)

    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.bundles.junit5)
    testImplementation(libs.kotest.assertions)
    testImplementation(libs.mockk)
    testImplementation(libs.testcontainers)
}

tasks.test {
    useJUnitPlatform {
        excludeTags("integration")
    }
}
```

## 📝 Spring Boot Code Standards

### Application Class

```kotlin
// ✅ GOOD: Clean application class with config properties scan
@SpringBootApplication
@ConfigurationPropertiesScan
class ActoApiApplication

fun main(args: Array<String>) {
    runApplication<ActoApiApplication>(*args)
}

// ❌ BAD: Bloated application class
@SpringBootApplication
class ActoApiApplication {
    @Bean
    fun someBean() = ...

    @PostConstruct
    fun init() { ... }
}
```

### Configuration Properties

```kotlin
// ✅ GOOD: Type-safe configuration properties
@ConfigurationProperties(prefix = "app.feature-flags")
@ConstructorBinding
data class FeatureFlagProperties(
    val newDashboardEnabled: Boolean = false,
    val betaFeatures: List<String> = emptyList(),
)

// ✅ GOOD: Validate configuration
@ConfigurationProperties(prefix = "mail")
@Validated
data class MailConfiguration(
    @NotBlank val host: String,
    @NotNull val port: Int,
    val credentials: MailCredentials,
)

data class MailCredentials(
    @NotBlank val username: String,
    @NotBlank val password: String,
)
```

### Service Layer

```kotlin
// ✅ GOOD: Constructor injection with repository pattern
@Service
class TeamService(
    private val repositoryProvider: RepositoryProvider,
    private val employeeService: EmployeeService,
    private val analyticsServiceClient: AnalyticsServiceClient,
    private val clock: Clock,
) {
    fun getManagedEmployees(
        authentication: JwtTenantUserAuthentication,
        first: Int,
        after: EmployeeCursor?,
    ): PagedResult<ManagedEmployee> {
        val (regions, branches) = authentication.user.managerAccessFilters
        val userRepository = repositoryProvider.get<UserRepository>()

        // Implementation
    }

    // ✅ GOOD: Coroutine suspend functions for async operations
    suspend fun getTeamKpiSummaries(
        authentication: JwtTenantUserAuthentication,
        period: StandardPeriod,
        granularity: Granularity,
        kpis: List<Kpi>,
    ): KpiSummaries? {
        // Implementation with coroutines
    }
}

// ❌ BAD: Field injection
@Service
class UserService {
    @Autowired
    lateinit var repository: UserRepository
}
```

### Repository Pattern

```kotlin
// ✅ GOOD: Repository interface with JOOQ
@Repository
class UserRepository(
    private val dsl: DSLContext,
) {
    fun findById(id: UUID): User? {
        return dsl.selectFrom(USER)
            .where(USER.ID.eq(id))
            .fetchOneInto(User::class.java)
    }

    fun findManagedUsers(
        managerRegions: List<String>,
        managerBranches: List<String>,
        limit: Int,
        afterUserDetailsId: Int?,
    ): PagedResult<User> {
        // Implementation with cursor pagination
    }
}

// ✅ GOOD: Repository provider for dependency injection
@Service
class TeamService(
    private val repositoryProvider: RepositoryProvider,
) {
    fun someMethod() {
        val userRepository = repositoryProvider.get<UserRepository>()
        // Use repository
    }
}
```

### Controller Layer (GraphQL)

```kotlin
// ✅ GOOD: GraphQL controller with batch mapping
@Controller
class TeamController(
    private val teamService: TeamService,
    private val cursorService: CursorService,
    private val repositoryProvider: RepositoryProvider,
) {
    @QueryMapping
    fun team(authentication: JwtTenantUserAuthentication): Team? {
        val role = TenantUserRole.getMostPowerful(authentication.roles)
        if (role == null || !role.isManager) {
            return null
        }
        return Team
    }

    // ✅ GOOD: Schema mapping for nested fields
    @SchemaMapping(typeName = "Team", field = "employees")
    suspend fun employees(
        @Argument first: Int?,
        @Argument after: String?,
        authentication: JwtTenantUserAuthentication,
    ): EmployeeConnection {
        val cursorData = after?.let { cursorService.decode(it, cursorStrategy) }
        val result = teamService.getSortedManagedEmployees(
            authentication = authentication,
            first = first ?: 10,
            after = cursorData,
        )
        // Return connection
    }

    // ✅ GOOD: Batch mapping to solve N+1 problem
    @BatchMapping(typeName = "Employee", field = "meetings")
    fun meetings(
        employees: List<Employee>,
        authentication: JwtTenantUserAuthentication,
    ): Map<Employee, MeetingConnection> {
        val employeeUuids = employees.map { UUID.fromString(it.id.toString()) }
        // Batch fetch meetings
    }
}

// ❌ BAD: No batch mapping causing N+1 queries
```

### Pagination

```kotlin
// ✅ GOOD: Cursor-based pagination
data class EmployeeCursor(
    val userDetailsId: Int,
    val orderBy: String,
    val sortValue: Double?,
    val sortName: String,
)

data class PagedResult<T>(
    val items: List<T>,
    val hasMore: Boolean,
)

// ✅ GOOD: Pagination options
data class PaginationOptions<T>(
    val first: Int,
    val after: T?,
)
```

### Coroutines & Structured Concurrency

```kotlin
// ✅ GOOD: Parallel execution with coroutines
suspend fun getEmployeeData(
    employeeIds: List<UUID>,
): EmployeeData = coroutineScope {
    val employeesDeferred = async {
        employeeService.getEmployees(employeeIds)
    }

    val kpisDeferred = async {
        analyticsService.getKpis(employeeIds)
    }

    val employees = employeesDeferred.await()
    val kpis = kpisDeferred.await()

    // Combine results
}

// ✅ GOOD: WithContext for dispatcher switching
suspend fun fetchData(): Data = withContext(Dispatchers.IO) {
    repository.findAll()
}

// ❌ BAD: Blocking calls in coroutines
suspend fun badExample() {
    val result = Thread.sleep(1000) // Never do this
}
```

### Error Handling

```kotlin
// ✅ GOOD: Custom exceptions
sealed class ApiError(message: String) : Exception(message) {
    data class EntityNotFoundError(val entityType: String, val id: UUID) :
        ApiError("$entityType with ID: $id not found")

    data class AuthorizationError(val user: User, val action: String) :
        ApiError("User ${user.id} not authorized for $action")
}

// ✅ GOOD: Global exception handler
@ControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(ApiError::class)
    fun handleApiError(error: ApiError): ResponseEntity<ErrorResponse> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ErrorResponse(error.message))
    }
}
```

### Logging

```kotlin
// ✅ GOOD: Structured logging with context
@Service
class TeamService(
    private val repositoryProvider: RepositoryProvider,
) {
    private val logger = LoggerFactory.getLogger(TeamService::class.java)

    fun getManagedEmployees(...): PagedResult<ManagedEmployee> {
        logger.debug(
            "Fetching managed employees: regions={}, branches={}",
            regions, branches
        )

        WideEventContext.addContext(
            mapOf(
                "operation" to "team.employees",
                "first" to first,
                "has_cursor" to (after != null),
            )
        )

        // Implementation
    }
}
```

## 🧪 Testing Standards

### Unit Tests

```kotlin
// ✅ GOOD: JUnit 5 with Kotest assertions
class TeamServiceTest {
    private lateinit var teamService: TeamService
    private val repositoryProvider = mockk<RepositoryProvider>()
    private val employeeService = mockk<EmployeeService>()

    @BeforeEach
    fun setup() {
        teamService = TeamService(
            repositoryProvider = repositoryProvider,
            employeeService = employeeService,
            analyticsServiceClient = mockk(),
            clock = Clock.systemDefaultZone(),
        )
    }

    @Test
    fun `getManagedEmployees returns empty list when no employees`() {
        // Given
        val authentication = createTestAuthentication()
        every { repositoryProvider.get<UserRepository>() } returns mockk {
            every { findManagedUsers(...) } returns PagedResult(emptyList(), false)
        }

        // When
        val result = teamService.getManagedEmployees(authentication, 10, null)

        // Then
        result.items shouldBeEmpty()
        result.hasMore shouldBe false
    }
}
```

### Integration Tests

```kotlin
// ✅ GOOD: Integration test with testcontainers
@IntegrationTest
class UserRepositoryIntegrationTest {
    private lateinit var repository: UserRepository
    private val postgresContainer = PostgreSQLContainer<Nothing>("postgres:16")

    @BeforeEach
    fun setup() {
        postgresContainer.start()
        val datasource = DataSourceBuilder.create()
            .url(postgresContainer.jdbcUrl)
            .username(postgresContainer.username)
            .password(postgresContainer.password)
            .build()

        repository = UserRepository(DSLContextFactory.from(datasource))
    }

    @Test
    fun `findById returns user when exists`() {
        // Given
        val user = createTestUser()
        repository.save(user)

        // When
        val result = repository.findById(user.id)

        // Then
        result shouldBeEqualTo user
    }
}

// Tag integration tests
@Tag("integration")
class IntegrationTests { ... }
```

### Test Helpers

```kotlin
// ✅ GOOD: Reusable test extensions
@ExtendWith(PostgresLifecycleExtension::class)
class PostgresTest {
    // Access to postgresContainer via ExtensionContext
}

// ✅ GOOD: Test fixtures
object TestFixtures {
    fun createTestUser(
        id: UUID = UUID.randomUUID(),
        name: String = "Test User",
    ) = User(id = id, name = name)
}
```

## 📦 Dependency Management

### Version Catalogs (libs.versions.toml)

```toml
[versions]
spring-boot = "3.5.10"
kotlin = "2.3.0"
kotest = "5.9.1"

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-spring = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }
spring = { id = "org.springframework.boot", version.ref = "spring-boot" }

[libraries]
spring-boot-starter-web = { group = "org.springframework.boot", name = "spring-boot-starter-web" }
spring-boot-starter-graphql = { group = "org.springframework.boot", name = "spring-boot-starter-graphql" }
kotest-assertions = { group = "io.kotest", name = "kotest-assertions-core", version.ref = "kotest" }

[bundles]
kotlin = ["kotlin-reflect", "kotlinx-coroutines-core"]
testing = ["junit5-jupiter", "kotest-assertions", "mockk"]
```

### Dependency Rules

- Use version catalogs for centralized dependency management
- Use Spring Boot BOM for transitive dependency versions
- Prefer platform-specific starters over generic dependencies

## 🚫 Spring Boot-Specific Restrictions

### Never Do These:

- ❌ Never use field injection (`@Autowired lateinit var`) – use constructor injection
- ❌ Never block coroutines with `.get()` or `.join()` – use suspend functions
- ❌ Never commit transactions in service layer – keep transactions at repository level
- ❌ Never return JPA entities from controllers – use DTOs
- ❌ Never ignore nullable types – use `?` and safe calls
- ❌ Never use `any` in Kotlin code – use proper types
- ❌ Never hardcode configuration – use `application.yml`
- ❌ Never write business logic in controllers – delegate to services

### Avoid These When Possible:

- ⚠️ Avoid circular dependencies between services
- ⚠️ Avoid monolithic controllers – delegate to services
- ⚠️ Avoid mutable data classes – use `val` properties
- ⚠️ Avoid `!!` operator – use safe calls or `requireNotNull`
- ⚠️ Avoid complex inheritance hierarchies – prefer composition

Last updated: 2026-04-05. This file extends the global rules in @AGENTS.md. Always check both files.
