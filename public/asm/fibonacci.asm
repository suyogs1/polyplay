; Fibonacci - Calculate the Nth Fibonacci number iteratively
; Input: N stored in data section
; Result stored in R0
.DATA
n: .WORD 10            ; Calculate 10th Fibonacci number
.TEXT
start:
    LOAD R0, [n]       ; R0 = N (which Fibonacci number to calculate)
    
    ; Handle base cases
    CMP R0, #0
    JZ zero_case       ; If N = 0, return 0
    CMP R0, #1
    JZ one_case        ; If N = 1, return 1
    
    ; Initialize for iteration
    MOV R1, #0         ; R1 = fib(0) = 0
    MOV R2, #1         ; R2 = fib(1) = 1
    MOV R3, #2         ; R3 = counter (start from 2)
    
fibonacci_loop:
    CMP R3, R0         ; Compare counter with N
    JG done            ; If counter > N, we're done
    
    ; Calculate next Fibonacci number
    ADD R4, R1, R2     ; R4 = fib(i-2) + fib(i-1)
    MOV R1, R2         ; Shift: fib(i-2) = fib(i-1)
    MOV R2, R4         ; Shift: fib(i-1) = fib(i)
    
    INC R3             ; Increment counter
    JMP fibonacci_loop ; Continue loop
    
done:
    MOV R0, R2         ; Move result to R0
    SYS #1             ; Print the result
    HALT               ; Stop execution
    
zero_case:
    MOV R0, #0         ; Return 0
    SYS #1             ; Print result
    HALT
    
one_case:
    MOV R0, #1         ; Return 1
    SYS #1             ; Print result
    HALT

; Expected result: R0 = 55 (10th Fibonacci number)
; Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55...