FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Leverage Docker layer caching by copying the dependency descriptors first
COPY pom.xml ./
COPY src ./src

RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
