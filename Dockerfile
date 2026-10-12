# Stage 1: Build the application with Maven and Java 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy pom.xml and download offline dependencies
COPY Library360_Upgraded/library360-api/pom.xml ./
RUN mvn dependency:go-offline -B

# Copy sources and package
COPY Library360_Upgraded/library360-api/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lightweight Java 21 runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=build /app/target/*.jar app.jar

ENV PORT=8081
EXPOSE 8081

ENTRYPOINT ["sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -Dserver.port=${PORT:-8081} -jar app.jar"]
