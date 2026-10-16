package com.balkaran.pipelinepulse.common;

import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

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