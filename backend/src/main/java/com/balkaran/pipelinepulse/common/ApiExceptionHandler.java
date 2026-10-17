package com.balkaran.pipelinepulse.common;

import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpStatus;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.MediaType;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException exception
    ) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": "
                        + error.getDefaultMessage())
                .distinct()
                .sorted()
                .collect(Collectors.joining("; "));

        return badRequest("VALIDATION_ERROR", message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleInvalidJson(
            HttpMessageNotReadableException exception
    ) {
        return badRequest(
                "INVALID_JSON",
                "Request body must contain valid JSON with the expected fields"
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(
            ResourceNotFoundException exception
    ) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .contentType(MediaType.APPLICATION_JSON)
            .body(new ApiError(
                    new ErrorDetails("NOT_FOUND", exception.getMessage())
        ));
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiError> handleInvalidRequest(
            InvalidRequestException exception
    ) {
        return badRequest("VALIDATION_ERROR", exception.getMessage());
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ApiError> handleIdempotencyConflict(
            IdempotencyConflictException exception
    ) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiError(
                        new ErrorDetails(
                                "IDEMPOTENCY_CONFLICT",
                                exception.getMessage()
                        )
                ));
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(
            MethodArgumentTypeMismatchException exception
    ) {
        return badRequest(
                "VALIDATION_ERROR",
                exception.getName() + " has an invalid value"
        );
    }

    private static ResponseEntity<ApiError> badRequest(
            String code, String message
    ) {
        return ResponseEntity.badRequest()
                .body(new ApiError(new ErrorDetails(code, message)));
    }

    public record ApiError(ErrorDetails error) {
    }

    public record ErrorDetails(String code, String message) {
    }
}